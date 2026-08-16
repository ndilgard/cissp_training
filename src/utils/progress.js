// In-progress quiz snapshots, so closing the app mid-session doesn't lose it.
// Separate from history.js (seen/wrong tracking) and sessions.js (completed
// results) — this is specifically the "resume where I left off" state.

const PRACTICE_KEY = 'cissp_practice_progress';
const EXAM_KEY = 'cissp_exam_progress';

export function savePracticeProgress(state) {
  localStorage.setItem(
    PRACTICE_KEY,
    JSON.stringify({ ...state, savedAt: Date.now() }),
  );
}

export function getPracticeProgress() {
  try {
    return JSON.parse(localStorage.getItem(PRACTICE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearPracticeProgress() {
  localStorage.removeItem(PRACTICE_KEY);
}

export function saveExamProgress(state) {
  localStorage.setItem(
    EXAM_KEY,
    JSON.stringify({ ...state, savedAt: Date.now() }),
  );
}

export function getExamProgress() {
  try {
    return JSON.parse(localStorage.getItem(EXAM_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearExamProgress() {
  localStorage.removeItem(EXAM_KEY);
}
