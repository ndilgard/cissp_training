import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExamMode from './ExamMode.jsx';
import { saveExamProgress, getExamProgress } from '../utils/progress.js';
import { getSessions } from '../utils/sessions.js';

const FAKE_Q1 = {
  id: 'fake_e1',
  domain: 1,
  difficulty: 1,
  section: 'Test Section',
  question: 'Fake exam question one?',
  options: ['A', 'B', 'C', 'D'],
  answer: 0,
  explanation: 'Because A.',
};
const FAKE_Q2 = {
  id: 'fake_e2',
  domain: 1,
  difficulty: 2,
  section: 'Test Section',
  question: 'Fake exam question two?',
  options: ['A', 'B', 'C', 'D'],
  answer: 1,
  explanation: 'Because B.',
};

function seedInProgressExam() {
  saveExamProgress({
    phase: 'exam',
    catState: {
      theta: 0.3,
      answered: [
        { questionId: 'fake_e1', domain: 1, difficulty: 1, correct: true },
      ],
      usedIds: ['fake_e1'],
      sessionComplete: false,
      scaledScore: 0,
    },
    questionHistory: [
      { question: FAKE_Q1, selectedAnswer: 0, flagged: false },
      { question: FAKE_Q2, selectedAnswer: null, flagged: false },
    ],
    selected: null,
    remainingSeconds: 5400,
    timedOut: false,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('ExamMode resume flow', () => {
  it('goes straight into the exam when there is no saved progress', () => {
    render(<ExamMode onHome={() => {}} />);
    expect(
      screen.queryByText('Unfinished Exam Session'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('CISSP Exam Simulation')).toBeInTheDocument();
  });

  it('shows the resume screen with progress so far when an exam was left in progress', () => {
    seedInProgressExam();
    render(<ExamMode onHome={() => {}} />);
    expect(screen.getByText('Unfinished Exam Session')).toBeInTheDocument();
    expect(screen.getByText(/Question 2/)).toBeInTheDocument();
    expect(screen.getByText(/1\/1 correct so far/)).toBeInTheDocument();
  });

  it('Resume drops the user back into the exam at the saved question with time preserved', async () => {
    seedInProgressExam();
    render(<ExamMode onHome={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Resume/ }));
    expect(screen.getByText('Fake exam question two?')).toBeInTheDocument();
    expect(screen.getByText('Q 2')).toBeInTheDocument();
    // 5400s = 01:30:00 on the exam timer (hh:mm:ss, zero-padded)
    expect(screen.getByText('01:30:00')).toBeInTheDocument();
  });

  it('"Save Results & Start New" logs an incomplete session and starts a genuinely fresh exam', async () => {
    seedInProgressExam();
    render(<ExamMode onHome={() => {}} />);
    await userEvent.click(
      screen.getByRole('button', { name: /Save Results & Start New/ }),
    );

    expect(screen.getByText('CISSP Exam Simulation')).toBeInTheDocument();
    expect(screen.getByText('Q 1')).toBeInTheDocument();

    // Exam mode has no separate "setup" phase — it starts mid-exam, so the
    // continuous autosave effect immediately persists question 1 of the new
    // attempt. That snapshot must be a CLEAN start, not a leftover of the
    // discarded one: zero questions answered yet.
    const freshProgress = getExamProgress();
    expect(freshProgress).not.toBeNull();
    expect(freshProgress.catState.answered).toHaveLength(0);
    expect(freshProgress.questionHistory).toHaveLength(1);

    const sessions = getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      mode: 'exam',
      incomplete: true,
      correct: 1,
      total: 1,
    });
  });
});
