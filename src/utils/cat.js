// Simplified Computerized Adaptive Testing (CAT) engine
// Mimics ISC2's adaptive format: 100–150 questions, difficulty adjusts on performance

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

const MIN_QUESTIONS = 100;
const MAX_QUESTIONS = 150;
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
  const delta = correct ? 0.3 : -0.3;
  // Correct: harder questions reward more (difficultyOffset scales up with delta).
  // Incorrect: easier questions should PENALIZE MORE (missing an easy question is the
  // stronger signal you're overestimated) — same-signed scaling as the correct branch,
  // not inverted.
  const adjusted =
    theta + delta + (correct ? difficultyOffset * 0.2 : difficultyOffset * 0.1);
  return Math.max(-3, Math.min(3, adjusted));
}

// Pick the best next question: closest difficulty to current ability, domain-balanced,
// unseen preferred, previously-wrong questions get a boost.
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

  // Questions answered incorrectly in a past session must resurface until
  // answered correctly enough to clear their weight (see history.js) — this
  // takes priority over domain/difficulty balancing, not just a scoring boost.
  const unresolvedWrong = available.filter(
    (q) => (wrongWeights[q.id] || 0) > 0,
  );
  if (unresolvedWrong.length > 0) {
    const topN = Math.min(3, unresolvedWrong.length);
    return unresolvedWrong[Math.floor(Math.random() * topN)];
  }

  // Prefer questions not yet seen across sessions; fall back to seen if pool exhausted
  const unseen = available.filter((q) => !seenIds.has(q.id));
  const pool = unseen.length > 0 ? unseen : available;

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

// After each answer, check if we can confidently terminate early
export function shouldTerminate(state) {
  const n = state.answered.length;
  if (n < MIN_QUESTIONS) return false;
  if (n >= MAX_QUESTIONS) return true;

  // Terminate early if ability estimate is very stable (consistently above or below pass threshold)
  const recent = state.answered.slice(-15);
  const recentCorrect = recent.filter((a) => a.correct).length;

  if (n >= 100) {
    if (state.theta > 1.2 && recentCorrect >= 11) return true; // clearly passing
    if (state.theta < -1.2 && recentCorrect <= 4) return true; // clearly failing
  }
  return false;
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
