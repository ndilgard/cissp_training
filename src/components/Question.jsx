import { DOMAINS } from '../data/questions.js';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const DIFF_LABEL = { 1: 'Foundation', 2: 'Intermediate', 3: 'Advanced' };

export default function Question({
  question,
  questionNumber,
  totalQuestions,
  selected,
  onSelect,
  showResult,
  onNext,
  practiceMode,
  // Flagging (exam mode only)
  isFlagged = false,
  onFlag = null,
  // Per-question timer (practice mode)
  timeLimit = 0,      // seconds, 0 = off
  timeElapsed = 0,    // seconds elapsed this question
  // Next button label override
  nextLabel = null,
}) {
  if (!question) return null;

  const timePct = timeLimit > 0 ? Math.max(0, 1 - timeElapsed / timeLimit) : null;
  const timeUrgent = timePct !== null && timePct < 0.25;
  const timeRemaining = timeLimit > 0 ? Math.max(0, timeLimit - timeElapsed) : null;

  return (
    <div className="question-card">
      <div className="question-meta">
        <span className="question-meta__domain">{DOMAINS[question.domain]}</span>
        {practiceMode && (
          <span className={`question-meta__diff diff--${question.difficulty}`}>
            {DIFF_LABEL[question.difficulty]}
          </span>
        )}
        <span className="question-meta__progress">
          Question {questionNumber} of {totalQuestions}
        </span>
        {onFlag && (
          <button
            className={`flag-btn ${isFlagged ? 'flag-btn--active' : ''}`}
            onClick={onFlag}
            title={isFlagged ? 'Remove flag' : 'Flag for review'}
          >
            {isFlagged ? '🚩 Flagged' : '⚑ Flag'}
          </button>
        )}
      </div>

      <div className="question-progress-bar">
        <div
          className="question-progress-bar__fill"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {timePct !== null && (
        <div className="q-timer-bar-wrap">
          <div
            className={`q-timer-bar ${timeUrgent ? 'q-timer-bar--urgent' : ''}`}
            style={{ width: `${timePct * 100}%` }}
          />
          <span className={`q-timer-label ${timeUrgent ? 'q-timer-label--urgent' : ''}`}>
            {timeRemaining}s
          </span>
        </div>
      )}

      <p className="question-text">{question.question}</p>

      <ol className="options-list">
        {question.options.map((opt, i) => {
          let className = 'option';
          if (selected === i) className += ' option--selected';
          if (showResult) {
            if (i === question.answer) className += ' option--correct';
            else if (selected === i) className += ' option--wrong';
          }
          return (
            <li
              key={i}
              className={className}
              onClick={() => !showResult && onSelect(i)}
            >
              <span className="option__label">{OPTION_LABELS[i]}.</span>
              <span className="option__text">{opt}</span>
            </li>
          );
        })}
      </ol>

      {showResult && (
        <div className="explanation">
          {practiceMode && (
            <div className="explanation__ref">
              <div className="explanation__domain-info">
                <span className="explanation__domain-num">Domain {question.domain}</span>
                <span className="explanation__domain-name">{DOMAINS[question.domain]}</span>
                {question.section && <span className="explanation__section">{question.section}</span>}
              </div>
              {(selected === null || selected !== question.answer) && (
                <div className="explanation__correct-ans">
                  <span className="explanation__correct-label">Correct answer:</span>
                  <strong>{OPTION_LABELS[question.answer]}. {question.options[question.answer]}</strong>
                </div>
              )}
            </div>
          )}
          <strong>Explanation:</strong> {question.explanation}
        </div>
      )}

      <div className="question-actions">
        {!showResult ? (
          <button
            className="btn btn--primary"
            disabled={selected === null}
            onClick={onNext}
          >
            {nextLabel || (practiceMode ? 'Submit Answer' : 'Next Question →')}
          </button>
        ) : (
          <button className="btn btn--primary" onClick={onNext}>
            {nextLabel || 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  );
}
