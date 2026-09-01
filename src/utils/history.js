import { scheduleAutoSave } from './backup.js';

const SEEN_KEY = 'cissp_seen_questions';
const WRONG_KEY = 'cissp_wrong_answers';

// ── Seen tracking ──────────────────────────────────────────────
export function getSeenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function markSeen(ids) {
  const s = getSeenIds();
  ids.forEach((id) => s.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
  scheduleAutoSave();
}

export function getSeenCount() {
  return getSeenIds().size;
}

// ── Wrong-answer tracking (spaced repetition weights) ──────────
export function getWrongWeights() {
  try {
    return JSON.parse(localStorage.getItem(WRONG_KEY) || '{}');
  } catch {
    return {};
  }
}

// answered: [{ questionId, correct }]
export function updateWrongAnswers(answered) {
  const weights = getWrongWeights();
  answered.forEach(({ questionId, correct }) => {
    if (!correct) {
      weights[questionId] = (weights[questionId] || 0) + 1;
    } else {
      // Decay: correct answer reduces the weight by 1 (min 0)
      if (weights[questionId] > 0) weights[questionId]--;
      if (weights[questionId] === 0) delete weights[questionId];
    }
  });
  localStorage.setItem(WRONG_KEY, JSON.stringify(weights));
  scheduleAutoSave();
}

export function getWrongIds() {
  const w = getWrongWeights();
  return new Set(Object.keys(w));
}

// ── Reset ──────────────────────────────────────────────────────
export function resetHistory() {
  localStorage.removeItem(SEEN_KEY);
  localStorage.removeItem(WRONG_KEY);
  scheduleAutoSave();
}
