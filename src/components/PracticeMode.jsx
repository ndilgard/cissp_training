import { useState, useMemo, useEffect, useRef } from 'react';
import Question from './Question.jsx';
import Results from './Results.jsx';
import questions, { DOMAINS } from '../data/questions.js';
import { getCustomQuestions } from '../utils/customQuestions.js';
import { getSeenIds, markSeen, updateWrongAnswers, resetHistory, getSeenCount, getWrongIds } from '../utils/history.js';
import { saveSession } from '../utils/sessions.js';
import { getDomainBreakdown } from '../utils/cat.js';

const DIFF_OPTIONS = [
  { value: 0, label: 'All Levels' },
  { value: 1, label: 'Foundation' },
  { value: 2, label: 'Intermediate' },
  { value: 3, label: 'Advanced' },
];

const TIME_OPTIONS = [
  { value: 0,   label: 'No timer' },
  { value: 90,  label: '90 seconds' },
  { value: 60,  label: '60 seconds' },
  { value: 45,  label: '45 seconds' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildAllQuestions() {
  return [...questions, ...getCustomQuestions()];
}

export default function PracticeMode({ onHome, onWrongReview }) {
  const [phase, setPhase]               = useState('setup');
  const [selectedDomain, setDomain]     = useState(0);
  const [selectedDiff, setDiff]         = useState(0);
  const [questionCount, setCount]       = useState(20);
  const [timeLimit, setTimeLimit]       = useState(0);
  const [wrongOnly, setWrongOnly]       = useState(false);
  const [pool, setPool]                 = useState([]);
  const [index, setIndex]               = useState(0);
  const [selected, setSelected]         = useState(null);
  const [showResult, setShowResult]     = useState(false);
  const [answered, setAnswered]         = useState([]);
  const [seenCount, setSeenCount]       = useState(() => getSeenCount());
  const [timeElapsed, setTimeElapsed]   = useState(0);
  const timerRef = useRef(null);

  // Per-question countdown
  useEffect(() => {
    if (phase !== 'quiz' || timeLimit === 0 || showResult) return;
    setTimeElapsed(0);
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => {
        if (prev + 1 >= timeLimit) {
          clearInterval(timerRef.current);
          handleTimerExpire();
          return timeLimit;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, index, showResult, timeLimit]);

  function handleTimerExpire() {
    setSelected(null);
    setShowResult(true); // auto-show result; selected=null means wrong
  }

  function startPractice() {
    const allQ = buildAllQuestions();
    let filtered = allQ;
    if (selectedDomain > 0) filtered = filtered.filter(q => q.domain === selectedDomain);
    if (selectedDiff > 0)   filtered = filtered.filter(q => q.difficulty === selectedDiff);

    if (wrongOnly) {
      const wrongIds = getWrongIds();
      filtered = filtered.filter(q => wrongIds.has(q.id));
    }

    // Spaced repetition ordering: wrong first (sorted by count), then unseen, then seen-correct
    const seenIds = getSeenIds();
    const wrongIds = getWrongIds();
    const wrongQ   = shuffle(filtered.filter(q => wrongIds.has(q.id)));
    const unseenQ  = shuffle(filtered.filter(q => !seenIds.has(q.id) && !wrongIds.has(q.id)));
    const seenQ    = shuffle(filtered.filter(q => seenIds.has(q.id) && !wrongIds.has(q.id)));
    const ordered  = [...wrongQ, ...unseenQ, ...seenQ].slice(0, questionCount);

    if (ordered.length === 0) return;
    setPool(ordered);
    setIndex(0);
    setSelected(null);
    setShowResult(false);
    setAnswered([]);
    setTimeElapsed(0);
    setPhase('quiz');
  }

  function handleSubmit() {
    clearInterval(timerRef.current);
    setShowResult(true);
  }

  function handleNext() {
    clearInterval(timerRef.current);
    const currentQ = pool[index];
    const correct = selected === currentQ.answer;
    const entry = {
      questionId: currentQ.id,
      domain: currentQ.domain,
      difficulty: currentQ.difficulty,
      correct,
    };
    markSeen([currentQ.id]);
    updateWrongAnswers([entry]);
    const newAnswered = [...answered, entry];
    setAnswered(newAnswered);

    if (index + 1 >= pool.length) {
      saveSession({
        mode: 'practice',
        score: null,
        pct: Math.round(newAnswered.filter(a => a.correct).length / newAnswered.length * 100),
        correct: newAnswered.filter(a => a.correct).length,
        total: newAnswered.length,
        domainBreakdown: getDomainBreakdown(newAnswered),
      });
      setPhase('results');
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setShowResult(false);
    setTimeElapsed(0);
  }

  function handleResetHistory() {
    resetHistory();
    setSeenCount(0);
    setWrongOnly(false);
  }

  const { availableCount, unseenCount, wrongCount } = useMemo(() => {
    const allQ = buildAllQuestions();
    let filtered = allQ;
    if (selectedDomain > 0) filtered = filtered.filter(q => q.domain === selectedDomain);
    if (selectedDiff > 0)   filtered = filtered.filter(q => q.difficulty === selectedDiff);
    const seenIds  = getSeenIds();
    const wrongIds = getWrongIds();
    return {
      availableCount: filtered.length,
      unseenCount: filtered.filter(q => !seenIds.has(q.id)).length,
      wrongCount:  filtered.filter(q => wrongIds.has(q.id)).length,
    };
  }, [selectedDomain, selectedDiff, seenCount]);

  if (phase === 'setup') {
    const effectiveAvailable = wrongOnly ? wrongCount : availableCount;
    return (
      <div className="setup-card">
        <h2>Practice Mode</h2>
        <p className="setup-card__sub">Explanations after each answer. Wrong answers are prioritized automatically.</p>

        <div className="form-group">
          <label>Domain</label>
          <select value={selectedDomain} onChange={e => setDomain(Number(e.target.value))}>
            <option value={0}>All Domains</option>
            {Object.entries(DOMAINS).map(([num, name]) => (
              <option key={num} value={Number(num)}>Domain {num} – {name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Difficulty</label>
          <select value={selectedDiff} onChange={e => setDiff(Number(e.target.value))}>
            {DIFF_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Per-Question Timer</label>
          <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}>
            {TIME_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {wrongCount > 0 && (
          <label className="toggle-row">
            <input type="checkbox" checked={wrongOnly} onChange={e => setWrongOnly(e.target.checked)} />
            <span>Review wrong answers only <span className="badge-wrong">{wrongCount} questions</span></span>
          </label>
        )}

        <div className="form-group">
          <label>Number of Questions</label>
          <input
            type="range"
            min={5}
            max={Math.min(50, effectiveAvailable || 50)}
            value={Math.min(questionCount, effectiveAvailable || questionCount)}
            onChange={e => setCount(Number(e.target.value))}
          />
          <span className="form-group__value">{Math.min(questionCount, effectiveAvailable || questionCount)}</span>
        </div>

        <div className="setup-card__stats">
          <span className="stat"><span className="stat__num">{availableCount}</span> match filters</span>
          <span className="stat stat--fresh"><span className="stat__num">{unseenCount}</span> not yet seen</span>
          {wrongCount > 0 && <span className="stat stat--wrong"><span className="stat__num">{wrongCount}</span> need review</span>}
          {seenCount > 0 && (
            <button className="btn-link" onClick={handleResetHistory}>
              Reset history ({seenCount} seen)
            </button>
          )}
        </div>

        <button
          className="btn btn--primary btn--full"
          onClick={startPractice}
          disabled={effectiveAvailable === 0}
        >
          Start Practice →
        </button>
        <button className="btn btn--ghost btn--full" onClick={onHome}>← Back</button>
      </div>
    );
  }

  if (phase === 'results') {
    const wrongAnswers = answered.filter(a => !a.correct);
    return (
      <Results
        answered={answered}
        scaledScore={null}
        isPractice={true}
        onRestart={() => { setSeenCount(getSeenCount()); setPhase('setup'); }}
        onHome={onHome}
        onWrongReview={wrongAnswers.length > 0 ? () => onWrongReview(wrongAnswers.map(a => {
          const q = pool.find(p => p.id === a.questionId);
          return q;
        }).filter(Boolean)) : null}
      />
    );
  }

  const currentQ = pool[index];
  const seenIds = getSeenIds();
  const isNew = !seenIds.has(currentQ.id);
  const wrongIds = getWrongIds();
  const isWrong = wrongIds.has(currentQ.id);

  return (
    <div className="exam-layout">
      <header className="exam-header">
        <div className="exam-header__title">Practice Mode</div>
        <div className="exam-header__progress">
          Q {index + 1}/{pool.length}
          {isWrong && <span className="badge-wrong-sm">Review</span>}
          {isNew && !isWrong && <span className="badge-new">NEW</span>}
        </div>
      </header>

      <main className="exam-main">
        <Question
          question={currentQ}
          questionNumber={index + 1}
          totalQuestions={pool.length}
          selected={selected}
          onSelect={setSelected}
          showResult={showResult}
          onNext={showResult ? handleNext : handleSubmit}
          practiceMode={true}
          timeLimit={timeLimit}
          timeElapsed={timeElapsed}
        />
      </main>
    </div>
  );
}
