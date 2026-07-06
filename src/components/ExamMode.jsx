import { useState, useCallback } from 'react';
import { Flag } from 'lucide-react';
import Question from './Question.jsx';
import Timer from './Timer.jsx';
import Results from './Results.jsx';
import ExamReview from './ExamReview.jsx';
import questions from '../data/questions.js';
import { getCustomQuestions } from '../utils/customQuestions.js';
import {
  initialState,
  updateTheta,
  selectNextQuestion,
  shouldTerminate,
  calculateScaledScore,
  getDomainBreakdown,
  getDifficultyBreakdown,
  shuffleOptions,
} from '../utils/cat.js';
import { getSeenIds, markSeen, updateWrongAnswers, getWrongWeights } from '../utils/history.js';
import { saveSession } from '../utils/sessions.js';

const EXAM_SECONDS = 3 * 60 * 60;

function buildQuestionPool() {
  return [...questions, ...getCustomQuestions()];
}

export default function ExamMode({ onHome }) {
  const allQuestions = buildQuestionPool();
  const [seenIds]     = useState(() => getSeenIds());
  const [wrongWeights] = useState(() => getWrongWeights());

  const [catState, setCatState]         = useState(() => initialState());
  const [questionHistory, setQHistory]  = useState(() => {
    const firstQ = selectNextQuestion(allQuestions, initialState(), getSeenIds(), getWrongWeights());
    return [{ question: shuffleOptions(firstQ), selectedAnswer: null, flagged: false }];
  });
  const [selected, setSelected]         = useState(null);
  const [phase, setPhase]               = useState('exam'); // 'exam' | 'review' | 'results'
  const [scaledScore, setScaledScore]   = useState(0);
  const [timedOut, setTimedOut]         = useState(false);
  const [finalAnswered, setFinalAnswered] = useState([]);

  const currentIdx = catState.answered.length; // index of question being answered
  const currentEntry = questionHistory[currentIdx];

  const handleExpire = useCallback(() => {
    setTimedOut(true);
    submitExam(questionHistory, catState);
  }, [questionHistory, catState]);

  function submitExam(history, state) {
    // Build answered array from history (unanswered = wrong)
    const answered = history.map(entry => ({
      questionId: entry.question.id,
      domain: entry.question.domain,
      difficulty: entry.question.difficulty,
      correct: entry.selectedAnswer === entry.question.answer,
    }));

    markSeen(answered.map(a => a.questionId));
    updateWrongAnswers(answered);

    const score = calculateScaledScore(state);
    setScaledScore(score);
    setFinalAnswered(answered);

    saveSession({
      mode: 'exam',
      score,
      pct: Math.round(answered.filter(a => a.correct).length / answered.length * 100),
      correct: answered.filter(a => a.correct).length,
      total: answered.length,
      domainBreakdown: getDomainBreakdown(answered),
      difficultyBreakdown: getDifficultyBreakdown(answered),
    });

    setPhase('results');
  }

  function handleNext() {
    if (selected === null) return;

    // Save answer to history
    const updatedHistory = questionHistory.map((e, i) =>
      i === currentIdx ? { ...e, selectedAnswer: selected } : e
    );

    const correct = selected === currentEntry.question.answer;
    const newTheta = updateTheta(catState.theta, correct, currentEntry.question.difficulty);
    const newAnswered = [
      ...catState.answered,
      {
        questionId: currentEntry.question.id,
        domain: currentEntry.question.domain,
        difficulty: currentEntry.question.difficulty,
        correct,
      },
    ];
    const newUsed = new Set(catState.usedIds);
    newUsed.add(currentEntry.question.id);
    const newState = { ...catState, theta: newTheta, answered: newAnswered, usedIds: newUsed };

    setCatState(newState);
    setSelected(null);

    if (shouldTerminate(newState)) {
      setQHistory(updatedHistory);
      setPhase('review');
      return;
    }

    const next = selectNextQuestion(allQuestions, newState, seenIds, wrongWeights);
    if (!next) {
      setQHistory(updatedHistory);
      setPhase('review');
      return;
    }

    setQHistory([...updatedHistory, { question: shuffleOptions(next), selectedAnswer: null, flagged: false }]);
  }

  function handleToggleFlag() {
    setQHistory(prev => prev.map((e, i) =>
      i === currentIdx ? { ...e, flagged: !e.flagged } : e
    ));
  }

  function handleFinishEarly() {
    // Save current selection if any
    const updatedHistory = selected !== null
      ? questionHistory.map((e, i) => i === currentIdx ? { ...e, selectedAnswer: selected } : e)
      : questionHistory;
    setQHistory(updatedHistory);
    setPhase('review');
  }

  // Review screen callbacks
  function handleUpdateAnswer(idx, ans) {
    setQHistory(prev => prev.map((e, i) => i === idx ? { ...e, selectedAnswer: ans } : e));
  }
  function handleToggleFlagReview(idx) {
    setQHistory(prev => prev.map((e, i) => i === idx ? { ...e, flagged: !e.flagged } : e));
  }

  function handleRestart() {
    const fresh = initialState();
    const freshSeen = getSeenIds();
    const freshWeights = getWrongWeights();
    const firstQ = selectNextQuestion(allQuestions, fresh, freshSeen, freshWeights);
    setCatState(fresh);
    setQHistory([{ question: shuffleOptions(firstQ), selectedAnswer: null, flagged: false }]);
    setSelected(null);
    setPhase('exam');
    setTimedOut(false);
  }

  if (phase === 'review') {
    return (
      <ExamReview
        questionHistory={questionHistory}
        onUpdateAnswer={handleUpdateAnswer}
        onToggleFlag={handleToggleFlagReview}
        onSubmit={() => submitExam(questionHistory, catState)}
      />
    );
  }

  if (phase === 'results') {
    return (
      <Results
        answered={finalAnswered}
        scaledScore={scaledScore}
        isPractice={false}
        onRestart={handleRestart}
        onHome={onHome}
        questionHistory={questionHistory}
      />
    );
  }

  const questionNumber = currentIdx + 1;
  const canFinishEarly = catState.answered.length >= 100;
  const flagCount = questionHistory.filter(e => e.flagged).length;

  return (
    <div className="exam-layout">
      <header className="exam-header">
        <div className="exam-header__title">CISSP Exam Simulation</div>
        <Timer totalSeconds={EXAM_SECONDS} onExpire={handleExpire} />
        <div className="exam-header__progress">
          Q {questionNumber}
          {flagCount > 0 && <span className="flag-count"><Flag size={13} strokeWidth={2} /> {flagCount}</span>}
        </div>
      </header>

      {timedOut && (
        <div className="banner banner--warn">
          Time expired — please submit your exam.
        </div>
      )}

      <main className="exam-main">
        <Question
          question={currentEntry?.question}
          questionNumber={questionNumber}
          totalQuestions={150}
          selected={selected}
          onSelect={setSelected}
          showResult={false}
          onNext={handleNext}
          practiceMode={false}
          isFlagged={currentEntry?.flagged || false}
          onFlag={handleToggleFlag}
        />

        {canFinishEarly && (
          <div className="finish-early">
            <button className="btn btn--secondary" onClick={handleFinishEarly}>
              Finish &amp; Review Answers →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
