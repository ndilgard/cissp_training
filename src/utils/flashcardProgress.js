const KEY = 'cissp_flashcard_progress';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(weights) {
  localStorage.setItem(KEY, JSON.stringify(weights));
}

export function getFlashcardWeights() {
  return load();
}

export function updateFlashcardWeight(id, knew) {
  const weights = load();
  if (knew) {
    if ((weights[id] || 0) > 0) weights[id]--;
    if (weights[id] === 0) delete weights[id];
  } else {
    weights[id] = (weights[id] || 0) + 1;
  }
  save(weights);
}

export function getFlashcardsDue() {
  const weights = load();
  return new Set(Object.keys(weights).filter((id) => weights[id] > 0));
}

export function resetFlashcardProgress() {
  localStorage.removeItem(KEY);
}
