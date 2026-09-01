import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PracticeMode from './PracticeMode.jsx';
import {
  savePracticeProgress,
  getPracticeProgress,
} from '../utils/progress.js';
import { getSessions } from '../utils/sessions.js';

const FAKE_POOL = [
  {
    id: 'fake_1',
    domain: 1,
    difficulty: 1,
    section: 'Test Section',
    question: 'Fake question one?',
    options: ['A', 'B', 'C', 'D'],
    answer: 0,
    explanation: 'Because A.',
  },
  {
    id: 'fake_2',
    domain: 1,
    difficulty: 1,
    section: 'Test Section',
    question: 'Fake question two?',
    options: ['A', 'B', 'C', 'D'],
    answer: 1,
    explanation: 'Because B.',
  },
];

function seedInProgressSession() {
  savePracticeProgress({
    pool: FAKE_POOL,
    index: 1,
    selected: null,
    showResult: false,
    answered: [
      { questionId: 'fake_1', domain: 1, difficulty: 1, correct: true },
    ],
    timeLimit: 0,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('PracticeMode resume flow', () => {
  it('goes straight to setup when there is no saved progress', () => {
    render(<PracticeMode onHome={() => {}} onWrongReview={() => {}} />);
    expect(
      screen.getByRole('heading', { name: 'Practice Mode' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Unfinished Practice Session'),
    ).not.toBeInTheDocument();
  });

  it('shows the resume screen with progress so far when a session was left in progress', () => {
    seedInProgressSession();
    render(<PracticeMode onHome={() => {}} onWrongReview={() => {}} />);
    expect(screen.getByText('Unfinished Practice Session')).toBeInTheDocument();
    expect(screen.getByText(/Question 2 of 2/)).toBeInTheDocument();
    expect(screen.getByText(/1\/1 correct so far/)).toBeInTheDocument();
  });

  it('Resume drops the user back into the quiz at the saved question', async () => {
    seedInProgressSession();
    render(<PracticeMode onHome={() => {}} onWrongReview={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Resume/ }));
    expect(screen.getByText('Fake question two?')).toBeInTheDocument();
    expect(screen.getByText('Q 2/2')).toBeInTheDocument();
  });

  it('"Save Results & Start New" logs an incomplete session and clears saved progress', async () => {
    seedInProgressSession();
    render(<PracticeMode onHome={() => {}} onWrongReview={() => {}} />);
    await userEvent.click(
      screen.getByRole('button', { name: /Save Results & Start New/ }),
    );

    expect(
      screen.getByRole('heading', { name: 'Practice Mode' }),
    ).toBeInTheDocument();
    expect(getPracticeProgress()).toBeNull();

    const sessions = getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      mode: 'practice',
      incomplete: true,
      correct: 1,
      total: 1,
    });
  });
});
