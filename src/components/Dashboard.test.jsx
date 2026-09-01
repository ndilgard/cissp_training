import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard.jsx';
import { saveSession } from '../utils/sessions.js';

beforeEach(() => {
  localStorage.clear();
});

function seedExamSessions() {
  saveSession({
    mode: 'exam',
    score: 800,
    pct: 80,
    correct: 80,
    total: 100,
    domainBreakdown: {},
    difficultyBreakdown: {},
  });
  saveSession({
    mode: 'exam',
    score: 600,
    pct: 60,
    correct: 60,
    total: 100,
    domainBreakdown: {},
    difficultyBreakdown: {},
  });
  // Abandoned exam with an inflated score — must not count toward the average
  // or pass rate, and must not be silently folded into the "N exams" denominator.
  saveSession({
    mode: 'exam',
    incomplete: true,
    score: 1000,
    pct: 100,
    correct: 20,
    total: 20,
    domainBreakdown: {},
    difficultyBreakdown: {},
  });
}

describe('Dashboard incomplete-session handling', () => {
  it('excludes incomplete exams from average score and pass rate', () => {
    seedExamSessions();
    render(<Dashboard onHome={() => {}} />);

    // avg of the two COMPLETED exams only: (800 + 600) / 2 = 700
    expect(screen.getByText('700')).toBeInTheDocument();
    // pass rate: 1 of 2 completed exams passed (>=700) = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows a consistent completed-exam denominator in the pass-rate sub-label', () => {
    seedExamSessions();
    render(<Dashboard onHome={() => {}} />);
    // Must read "1/2 exams" (completed only), not "1/3" (including the incomplete one)
    expect(screen.getByText('1/2 exams')).toBeInTheDocument();
  });

  it('flags the incomplete session with a "partial" badge in the session list', () => {
    seedExamSessions();
    render(<Dashboard onHome={() => {}} />);
    expect(screen.getByText('partial')).toBeInTheDocument();
  });
});
