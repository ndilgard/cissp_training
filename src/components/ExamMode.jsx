import { useState, useCallback, useEffect, useRef } from 'react';
import { Flag, Pause } from 'lucide-react';
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
  EXAM_QUESTION_COUNT,
} from '../utils/cat.js';
import {
  getSeenIds,
  markSeen,
  updateWrongAnswers,
  getWrongWeights,
} from '../utils/history.js';
import { saveSession } from '../utils/sessions.js';
import {
  saveExamProgress,
  getExamProgress,
  clearExamProgress,
} from '../utils/progress.js';

const EXAM_SECONDS = 3 * 60 * 60;

function buildQuestionPool() {
  return [...questions, ...getCustomQuestions()];
}

export default function ExamMode({ onHome }) {
  const allQuestions = buildQuestionPool();
  const [seenIds] = useState(() => getSeenIds());
  const [wrongWeights] = useState(() => getWrongWeights());
  const [savedProgress] = useState(() => getExamProgress());

  const [catState, setCatState] = useState(() => initialState());
  const [questionHistory, setQHistory] = useState(() => {
    const firstQ = selectNextQuestion(
      allQuestions,
      initialState(),
      getSeenIds(),
      getWrongWeights(),
    );
    return [
      {
        question: shuffleOptions(firstQ),
        selectedAnswer: null,
        flagged: false,
      },
    ];
  });
  const [selected, setSelected] = useState(null);
  // 'resume' | 'exam' | 'paused' | 'review' | 'results'
  const [phase, setPhase] = useState(() => (savedProgress ? 'resume' : 'exam'));
  const [scaledScore, setScaledScore] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [finalAnswered, setFinalAnswered] = useState([]);
  const [examTotalSeconds, setExamTotalSeconds] = useState(
    () => savedProgress?.remainingSeconds ?? EXAM_SECONDS,
  );
  const remainingSecondsRef = useRef(examTotalSeconds);
  const handleTick = useCallback((secs) => {
    remainingSecondsRef.current = secs;
  }, []);

  // Continuously snapshot in-progress exam state so closing the app doesn't
  // lose it — mirrors PracticeMode's approach. usedIds is a Set, so it's
  // converted to an array for JSON storage.
  useEffect(() => {
    if (phase !== 'exam' && phase !== 'review' && phase !== 'paused') return;
    saveExamProgress({
      phase,
      catState: { ...catState, usedIds: [...catState.usedIds] },
      questionHistory,
      selected,
      remainingSeconds: remainingSecondsRef.current,
      timedOut,
    });
  }, [phase, catState, questionHistory, selected, timedOut]);

  function handleResume() {
    if (!savedProgress) {
      setPhase('exam');
      return;
    }
    setCatState({
      ...savedProgress.catState,
      usedIds: new Set(savedProgress.catState.usedIds),
    });
    setQHistory(savedProgress.questionHistory);
    setSelected(savedProgress.selected);
    setExamTotalSeconds(savedProgress.remainingSeconds ?? EXAM_SECONDS);
    setTimedOut(savedProgress.timedOut || false);
    setPhase(savedProgress.phase || 'exam');
  }

  function handleDiscardProgress() {
    const p = savedProgress;
    if (p && p.catState?.answered?.length > 0) {
      // Use catState.answered (committed answers only) — questionHistory
      // also includes the question currently on screen, which may still be
      // unanswered and would otherwise get scored as a miss.
      const answered = p.catState.answered;
      const score = calculateScaledScore(p.catState);
      saveSession({
        mode: 'exam',
        incomplete: true,
        score,
        pct: Math.round(
          (answered.filter((a) => a.correct).length / answered.length) * 100,
        ),
        correct: answered.filter((a) => a.correct).length,
        total: answered.length,
        domainBreakdown: getDomainBreakdown(answered),
        difficultyBreakdown: getDifficultyBreakdown(answered),
      });
    }
    clearExamProgress();
    setExamTotalSeconds(EXAM_SECONDS);
    setPhase('exam');
  }

  const currentIdx = catState.answered.length; // index of question being answered
  const currentEntry = questionHistory[currentIdx];

  const handleExpire = useCallback(() => {
    setTimedOut(true);
    submitExam(questionHistory, catState);
  }, [questionHistory, catState]);

  function submitExam(history, state) {
    // Build answered array from history (unanswered = wrong)
    const answered = history.map((entry) => ({
      questionId: entry.question.id,
      domain: entry.question.domain,
      difficulty: entry.question.difficulty,
      section: entry.question.section,
      correct: entry.selectedAnswer === entry.question.answer,
    }));

    markSeen(answered.map((a) => a.questionId));
    updateWrongAnswers(answered);

    const score = calculateScaledScore(state);
    setScaledScore(score);
    setFinalAnswered(answered);

    saveSession({
      mode: 'exam',
      score,
      pct: Math.round(
        (answered.filter((a) => a.correct).length / answered.length) * 100,
      ),
      correct: answered.filter((a) => a.correct).length,
      total: answered.length,
      domainBreakdown: getDomainBreakdown(answered),
      difficultyBreakdown: getDifficultyBreakdown(answered),
    });

    clearExamProgress();
    setPhase('results');
  }

  function handleNext() {
    if (selected === null) return;

    // Save answer to history
    const updatedHistory = questionHistory.map((e, i) =>
      i === currentIdx ? { ...e, selectedAnswer: selected } : e,
    );

    const correct = selected === currentEntry.question.answer;
    const newTheta = updateTheta(
      catState.theta,
      correct,
      currentEntry.question.difficulty,
    );
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
    const newState = {
      ...catState,
      theta: newTheta,
      answered: newAnswered,
      usedIds: newUsed,
    };

    setCatState(newState);
    setSelected(null);

    if (shouldTerminate(newState)) {
      setQHistory(updatedHistory);
      setPhase('review');
      return;
    }

    const next = selectNextQuestion(
      allQuestions,
      newState,
      seenIds,
      wrongWeights,
    );
    if (!next) {
      setQHistory(updatedHistory);
      setPhase('review');
      return;
    }

    setQHistory([
      ...updatedHistory,
      { question: shuffleOptions(next), selectedAnswer: null, flagged: false },
    ]);
  }

  function handleToggleFlag() {
    setQHistory((prev) =>
      prev.map((e, i) =>
        i === currentIdx ? { ...e, flagged: !e.flagged } : e,
      ),
    );
  }

  function handlePause() {
    setPhase('paused');
  }

  function handleResumeFromPause() {
    // Pausing unmounts <Timer> (the 'paused' phase renders a different screen
    // entirely), so resuming mounts a fresh Timer instance that reads its
    // starting point from examTotalSeconds. Without this sync, that state was
    // never updated from the tick-tracking ref, so every pause/resume silently
    // reset the clock back to the full exam duration.
    setExamTotalSeconds(remainingSecondsRef.current);
    setPhase('exam');
  }

  // Review screen callbacks
  function handleUpdateAnswer(idx, ans) {
    setQHistory((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, selectedAnswer: ans } : e)),
    );
  }
  function handleToggleFlagReview(idx) {
    setQHistory((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, flagged: !e.flagged } : e)),
    );
  }

  function handleRestart() {
    const fresh = initialState();
    const freshSeen = getSeenIds();
    const freshWeights = getWrongWeights();
    const firstQ = selectNextQuestion(
      allQuestions,
      fresh,
      freshSeen,
      freshWeights,
    );
    setCatState(fresh);
    setQHistory([
      {
        question: shuffleOptions(firstQ),
        selectedAnswer: null,
        flagged: false,
      },
    ]);
    setSelected(null);
    setPhase('exam');
    setTimedOut(false);
    setExamTotalSeconds(EXAM_SECONDS);
    clearExamProgress();
  }

  if (phase === 'resume') {
    const answeredCount = savedProgress?.catState?.answered?.length || 0;
    const correctCount =
      savedProgress?.catState?.answered?.filter((a) => a.correct).length || 0;
    return (
      <div className="setup-card">
        <h2>Unfinished Exam Session</h2>
        <p className="setup-card__sub">
          Question {answeredCount + 1} · {correctCount}/{answeredCount} correct
          so far · time remaining preserved
        </p>
        <button className="btn btn--primary btn--full" onClick={handleResume}>
          Resume →
        </button>
        <button
          className="btn btn--ghost btn--full"
          onClick={handleDiscardProgress}
        >
          Save Results &amp; Start New
        </button>
      </div>
    );
  }

  if (phase === 'paused') {
    const answeredSoFar = catState.answered;
    if (answeredSoFar.length === 0) {
      return (
        <div className="setup-card">
          <h2>Exam Paused</h2>
          <p className="setup-card__sub">
            Answer at least one question to see an interim score.
          </p>
          <button
            className="btn btn--primary btn--full"
            onClick={handleResumeFromPause}
          >
            Resume Exam →
          </button>
        </div>
      );
    }
    return (
      <Results
        answered={answeredSoFar}
        scaledScore={calculateScaledScore(catState)}
        isPractice={false}
        interim
        onResume={handleResumeFromPause}
        onHome={onHome}
        questionHistory={questionHistory.slice(0, answeredSoFar.length)}
      />
    );
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
  const flagCount = questionHistory.filter((e) => e.flagged).length;

  return (
    <div className="exam-layout">
      <header className="exam-header">
        <div className="exam-header__nav">
          <button className="btn btn--ghost" onClick={onHome}>
            ← Menu
          </button>
          <button className="btn btn--ghost" onClick={handlePause}>
            <Pause size={13} strokeWidth={2} /> Pause
          </button>
        </div>
        <div className="exam-header__title">CISSP Exam Simulation</div>
        <Timer
          totalSeconds={examTotalSeconds}
          onExpire={handleExpire}
          onTick={handleTick}
        />
        <div className="exam-header__progress">
          Q {questionNumber}
          {flagCount > 0 && (
            <span className="flag-count">
              <Flag size={13} strokeWidth={2} /> {flagCount}
            </span>
          )}
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
          totalQuestions={EXAM_QUESTION_COUNT}
          selected={selected}
          onSelect={setSelected}
          showResult={false}
          onNext={handleNext}
          practiceMode={false}
          isFlagged={currentEntry?.flagged || false}
          onFlag={handleToggleFlag}
        />
      </main>
    </div>
  );
}
