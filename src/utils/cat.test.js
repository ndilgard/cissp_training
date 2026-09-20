import { describe, it, expect } from 'vitest';
import {
  updateTheta,
  calculateScaledScore,
  shouldTerminate,
  getDomainBreakdown,
  getDifficultyBreakdown,
  getSubsectionWrongCounts,
  shuffleOptions,
  selectNextQuestion,
  initialState,
} from './cat.js';

describe('updateTheta', () => {
  it('rewards a correct answer, more for harder questions', () => {
    const easyCorrect = updateTheta(0, true, 1);
    const hardCorrect = updateTheta(0, true, 3);
    expect(easyCorrect).toBeGreaterThan(0);
    expect(hardCorrect).toBeGreaterThan(easyCorrect);
  });

  it('penalizes a wrong answer, MORE for easier questions (not less)', () => {
    // Regression test for the inverted-penalty bug: missing an easy question
    // is the stronger signal of overestimated ability and must hurt more
    // than missing a hard question, not less.
    const easyMiss = updateTheta(0, false, 1);
    const hardMiss = updateTheta(0, false, 3);
    expect(easyMiss).toBeLessThan(0);
    expect(hardMiss).toBeLessThan(0);
    expect(easyMiss).toBeLessThan(hardMiss); // easy miss drops theta further
  });

  it('clamps to the -3..3 range', () => {
    expect(updateTheta(2.95, true, 3)).toBeLessThanOrEqual(3);
    expect(updateTheta(-2.95, false, 1)).toBeGreaterThanOrEqual(-3);
    expect(updateTheta(3, true, 3)).toBe(3);
    expect(updateTheta(-3, false, 1)).toBe(-3);
  });

  it('treats medium difficulty as the neutral baseline', () => {
    const correct = updateTheta(0, true, 2);
    const wrong = updateTheta(0, false, 2);
    expect(correct).toBeCloseTo(0.3, 5);
    expect(wrong).toBeCloseTo(-0.5, 5);
  });

  it('does not ratchet to the ceiling at a realistic ~70% accuracy (regression)', () => {
    // Bug: at 71% accuracy on Advanced, theta used to climb (net +0.265/question)
    // and never release, pinning the exam at Advanced almost the whole time.
    // Simulate a 70/30 correct/wrong stream at difficulty 3 starting from theta=0.9
    // (just past the Advanced threshold) and confirm it settles rather than maxing out.
    let theta = 0.9;
    for (let i = 0; i < 100; i++) {
      const correct = i % 10 < 7; // 70% accuracy
      theta = updateTheta(theta, correct, 3);
    }
    expect(theta).toBeLessThan(3);
    expect(theta).toBeGreaterThan(0.8); // still holds Advanced-level ability
  });
});

describe('calculateScaledScore', () => {
  it('maps theta 0 to the midpoint (500)', () => {
    expect(calculateScaledScore({ theta: 0 })).toBe(500);
  });

  it('maps theta 3 to the max (1000) and -3 to the min (200)', () => {
    expect(calculateScaledScore({ theta: 3 })).toBe(1000);
    expect(calculateScaledScore({ theta: -3 })).toBe(200);
  });

  it('clamps out-of-range theta to the score bounds', () => {
    expect(calculateScaledScore({ theta: 10 })).toBe(1000);
    expect(calculateScaledScore({ theta: -10 })).toBe(200);
  });

  it('maps a theta near the pass line to roughly 700', () => {
    const score = calculateScaledScore({ theta: 1.2 });
    expect(score).toBeGreaterThan(650);
    expect(score).toBeLessThan(750);
  });
});

describe('shouldTerminate', () => {
  function state(overrides) {
    return { theta: 0, answered: [], ...overrides };
  }

  it('does not terminate before the fixed question count is reached', () => {
    const answered = Array(99).fill({ correct: true });
    expect(shouldTerminate(state({ answered, theta: 3 }))).toBe(false);
  });

  it('terminates once the fixed question count (100) is reached, regardless of theta', () => {
    const answered = Array(100).fill({ correct: false });
    expect(shouldTerminate(state({ answered, theta: 0 }))).toBe(true);
  });
});

describe('getDomainBreakdown', () => {
  it('aggregates correct/total counts per domain', () => {
    const answered = [
      { domain: 1, correct: true },
      { domain: 1, correct: false },
      { domain: 2, correct: true },
    ];
    const result = getDomainBreakdown(answered);
    expect(result[1]).toEqual({ correct: 1, total: 2 });
    expect(result[2]).toEqual({ correct: 1, total: 1 });
  });

  it('returns an empty object for no answers', () => {
    expect(getDomainBreakdown([])).toEqual({});
  });
});

describe('getDifficultyBreakdown', () => {
  it('aggregates correct/total counts per difficulty level', () => {
    const answered = [
      { difficulty: 1, correct: true },
      { difficulty: 3, correct: false },
      { difficulty: 3, correct: true },
    ];
    const result = getDifficultyBreakdown(answered);
    expect(result[1]).toEqual({ correct: 1, total: 1 });
    expect(result[3]).toEqual({ correct: 1, total: 2 });
  });
});

describe('getSubsectionWrongCounts', () => {
  it('counts wrong answers per section, worst-first, omitting perfect sections', () => {
    const answered = [
      { section: 'Risk Management', domain: 1, correct: false },
      { section: 'Risk Management', domain: 1, correct: false },
      { section: 'Access Control', domain: 5, correct: false },
      { section: 'Access Control', domain: 5, correct: true },
      { section: 'Perfect Section', domain: 2, correct: true },
    ];
    const result = getSubsectionWrongCounts(answered);
    expect(result[0]).toEqual({
      section: 'Risk Management',
      domain: 1,
      wrong: 2,
    });
    expect(result[1]).toEqual({
      section: 'Access Control',
      domain: 5,
      wrong: 1,
    });
    expect(result.find((r) => r.section === 'Perfect Section')).toBeUndefined();
  });
});

describe('shuffleOptions', () => {
  it('preserves the correct answer text at the new answer index after shuffling', () => {
    const question = {
      id: 'q1',
      options: ['Option A (correct)', 'Option B', 'Option C', 'Option D'],
      answer: 0,
    };
    // Run many times since shuffling is randomized — the invariant (the
    // option AT the new answer index is still the originally-correct text)
    // must hold every time, regardless of how the shuffle landed.
    for (let i = 0; i < 50; i++) {
      const shuffled = shuffleOptions(question);
      expect(shuffled.options).toHaveLength(4);
      expect(shuffled.options[shuffled.answer]).toBe('Option A (correct)');
      expect(new Set(shuffled.options)).toEqual(new Set(question.options));
    }
  });

  it('does not mutate the original question object', () => {
    const question = { id: 'q1', options: ['A', 'B', 'C', 'D'], answer: 2 };
    const original = { ...question, options: [...question.options] };
    shuffleOptions(question);
    expect(question).toEqual(original);
  });
});

describe('selectNextQuestion', () => {
  const pool = [
    { id: 'q1', domain: 1, difficulty: 2 },
    { id: 'q2', domain: 2, difficulty: 2 },
    { id: 'q3', domain: 3, difficulty: 2 },
  ];

  it('returns null when every question has already been used', () => {
    const state = {
      ...initialState(),
      usedIds: new Set(['q1', 'q2', 'q3']),
    };
    expect(selectNextQuestion(pool, state)).toBeNull();
  });

  it('never returns an already-used question', () => {
    const state = { ...initialState(), usedIds: new Set(['q1', 'q2']) };
    const next = selectNextQuestion(pool, state);
    expect(next.id).toBe('q3');
  });

  it('prioritizes a question with unresolved wrong-answer weight', () => {
    const state = initialState();
    const next = selectNextQuestion(pool, state, new Set(), { q2: 3 });
    expect(next.id).toBe('q2');
  });
});
