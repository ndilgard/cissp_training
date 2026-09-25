// Simplified Computerized Adaptive Testing (CAT) engine
// Fixed-length 100-question exam; difficulty adjusts on performance

import { DOMAIN_WEIGHTS } from '../data/questions.js';

// Shuffle a question's options and remap the answer index so correct answer
// is no longer predictable by position (corrects LLM length-bias artifact).
export function shuffleOptions(q) {
  const indices = [0, 1, 2, 3];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    ...q,
    options: indices.map((i) => q.options[i]),
    answer: indices.indexOf(q.answer),
  };
}

export const EXAM_QUESTION_COUNT = 100;
export const PASSING_SCALED_SCORE = 700;

// Item Response Theory-inspired ability estimation (simplified)
// theta: estimated ability on scale -3 to +3 (starts at 0 = medium)
export function initialState() {
  return {
    theta: 0,
    answered: [], // { questionId, domain, difficulty, correct }
    usedIds: new Set(),
    sessionComplete: false,
    scaledScore: 0,
  };
}

// Update ability estimate after each answer
export function updateTheta(theta, correct, difficulty) {
  const difficultyOffset = (difficulty - 2) * 0.8; // map 1/2/3 → -0.8/0/0.8
  // Wrong answers cost more than right answers earn. Without this asymmetry,
  // >32% accuracy at max difficulty was enough to ratchet theta to the ceiling
  // and never release — pinning users at Advanced for the whole exam even at a
  // realistic ~70% accuracy (the bug: 56/59 questions landing at Advanced despite
  // only 71% accuracy there). This calibration targets ~55-65% accuracy as the
  // equilibrium needed to hold a difficulty level, so a real ~70% scorer settles
  // near Advanced without getting permanently stuck there after a few lucky answers.
  const delta = correct ? 0.3 : -0.5;
  // Correct: harder questions reward more (difficultyOffset scales up with delta).
  // Incorrect: easier questions should PENALIZE MORE (missing an easy question is the
  // stronger signal you're overestimated) — same-signed scaling as the correct branch,
  // not inverted.
  const adjusted =
    theta +
    delta +
    (correct ? difficultyOffset * 0.1 : difficultyOffset * 0.05);
  return Math.max(-3, Math.min(3, adjusted));
}

// Pick the best next question: closest difficulty to current ability, domain-balanced.
// HARD CONSTRAINT: never resurface an already-seen question while unseen ones remain
// in the bank — an exam should not repeat questions until you've genuinely exhausted
// all 3000+. Previously-wrong-answer resurfacing is a secondary preference that only
// applies once you fall back to the seen pool (i.e. the bank really is exhausted).
// seenIds: cross-session history from localStorage (optional)
// wrongWeights: { questionId: wrongCount } from spaced repetition
export function selectNextQuestion(
  questions,
  state,
  seenIds = new Set(),
  wrongWeights = {},
) {
  const available = questions.filter((q) => !state.usedIds.has(q.id));
  if (available.length === 0) return null;

  // Prefer questions not yet seen across sessions — hard gate, not a soft boost.
  // A question can only carry wrong-answer weight if it's already been seen, so
  // this naturally excludes all wrong-weighted questions until the unseen pool
  // itself is empty.
  const unseen = available.filter((q) => !seenIds.has(q.id));
  const pool = unseen.length > 0 ? unseen : available;

  if (unseen.length === 0) {
    // Bank exhausted for this user (every available question has been seen
    // before) — now it's fair to prioritize resurfacing previously-wrong
    // questions over other seen ones, same as before.
    const unresolvedWrong = pool.filter((q) => (wrongWeights[q.id] || 0) > 0);
    if (unresolvedWrong.length > 0) {
      const topN = Math.min(3, unresolvedWrong.length);
      return unresolvedWrong[Math.floor(Math.random() * topN)];
    }
  }

  // Target difficulty based on theta
  const targetDiff = theta2difficulty(state.theta);

  // Domain balance: track how many questions per domain vs expected weight
  const domainCounts = {};
  state.answered.forEach((a) => {
    domainCounts[a.domain] = (domainCounts[a.domain] || 0) + 1;
  });
  const total = state.answered.length;

  // Score each candidate question
  const scored = pool.map((q) => {
    const diffScore = 1 - Math.abs(q.difficulty - targetDiff) / 2;
    const expectedFraction = DOMAIN_WEIGHTS[q.domain] || 0.125;
    const actualFraction =
      total > 0 ? (domainCounts[q.domain] || 0) / total : 0;
    const domainScore = Math.max(0, expectedFraction - actualFraction) * 5;
    return { q, score: diffScore + domainScore };
  });

  scored.sort((a, b) => b.score - a.score);
  // Add slight randomness among top candidates to avoid repetitive patterns
  const topN = Math.min(5, scored.length);
  const idx = Math.floor(Math.random() * topN);
  return scored[idx].q;
}

function theta2difficulty(theta) {
  if (theta < -0.8) return 1;
  if (theta > 0.8) return 3;
  return 2;
}

// Exam ends once the fixed question count is reached
export function shouldTerminate(state) {
  return state.answered.length >= EXAM_QUESTION_COUNT;
}

// Calculate final scaled score (200–1000 scale, passing = 700)
export function calculateScaledScore(state) {
  const { theta } = state;
  // Linear mapping: theta -3→200, 0→500, 3→1000 (non-linear at extremes)
  const raw = 500 + theta * 166.7;
  return Math.round(Math.max(200, Math.min(1000, raw)));
}

// Domain performance breakdown
export function getDomainBreakdown(answered) {
  const byDomain = {};
  answered.forEach(({ domain, correct }) => {
    if (!byDomain[domain]) byDomain[domain] = { correct: 0, total: 0 };
    byDomain[domain].total++;
    if (correct) byDomain[domain].correct++;
  });
  return byDomain;
}

// Missed-topics breakdown: count of wrong answers per subsection (question.section),
// sorted worst-first. Sections with zero wrong answers are omitted.
export function getSubsectionWrongCounts(answered) {
  const bySection = {};
  answered.forEach(({ section, domain, correct }) => {
    if (!section || correct) return;
    if (!bySection[section]) bySection[section] = { domain, wrong: 0 };
    bySection[section].wrong++;
  });
  return Object.entries(bySection)
    .map(([section, d]) => ({ section, domain: d.domain, wrong: d.wrong }))
    .sort((a, b) => b.wrong - a.wrong);
}

// Difficulty performance breakdown
export function getDifficultyBreakdown(answered) {
  const byDiff = {};
  answered.forEach(({ difficulty, correct }) => {
    if (!byDiff[difficulty]) byDiff[difficulty] = { correct: 0, total: 0 };
    byDiff[difficulty].total++;
    if (correct) byDiff[difficulty].correct++;
  });
  return byDiff;
}
