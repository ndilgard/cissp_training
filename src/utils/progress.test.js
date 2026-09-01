import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePracticeProgress,
  getPracticeProgress,
  clearPracticeProgress,
  saveExamProgress,
  getExamProgress,
  clearExamProgress,
} from './progress.js';

beforeEach(() => {
  localStorage.clear();
});

describe('practice progress', () => {
  it('round-trips state through save/get, stamping savedAt', () => {
    const state = { pool: ['q1', 'q2'], index: 1, selected: 0 };
    savePracticeProgress(state);
    const loaded = getPracticeProgress();
    expect(loaded).toMatchObject(state);
    expect(typeof loaded.savedAt).toBe('number');
  });

  it('returns null when nothing has been saved', () => {
    expect(getPracticeProgress()).toBeNull();
  });

  it('clear removes the saved state', () => {
    savePracticeProgress({ index: 0 });
    clearPracticeProgress();
    expect(getPracticeProgress()).toBeNull();
  });

  it('returns null instead of throwing on corrupted storage', () => {
    localStorage.setItem('cissp_practice_progress', '{not valid json');
    expect(getPracticeProgress()).toBeNull();
  });
});

describe('exam progress', () => {
  it('round-trips state through save/get, stamping savedAt', () => {
    const state = { phase: 'exam', remainingSeconds: 5400, timedOut: false };
    saveExamProgress(state);
    const loaded = getExamProgress();
    expect(loaded).toMatchObject(state);
    expect(typeof loaded.savedAt).toBe('number');
  });

  it('returns null when nothing has been saved', () => {
    expect(getExamProgress()).toBeNull();
  });

  it('clear removes the saved state', () => {
    saveExamProgress({ phase: 'exam' });
    clearExamProgress();
    expect(getExamProgress()).toBeNull();
  });

  it('returns null instead of throwing on corrupted storage', () => {
    localStorage.setItem('cissp_exam_progress', '{not valid json');
    expect(getExamProgress()).toBeNull();
  });
});

describe('practice and exam progress are independent', () => {
  it('saving one does not touch the other', () => {
    savePracticeProgress({ index: 3 });
    saveExamProgress({ phase: 'review' });
    clearPracticeProgress();
    expect(getPracticeProgress()).toBeNull();
    expect(getExamProgress()).toMatchObject({ phase: 'review' });
  });
});
