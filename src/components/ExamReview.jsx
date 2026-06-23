import { useState } from 'react';
import { Flag } from 'lucide-react';
import Question from './Question.jsx';
import { DOMAINS } from '../data/questions.js';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function ExamReview({ questionHistory, onUpdateAnswer, onToggleFlag, onSubmit }) {
  const [viewing, setViewing] = useState(null); // null = overview, number = index

  const flaggedCount = questionHistory.filter(e => e.flagged).length;
  const answeredCount = questionHistory.filter(e => e.selectedAnswer !== null).length;
  const unanswered = questionHistory.length - answeredCount;

  if (viewing !== null) {
    const entry = questionHistory[viewing];
    return (
      <div className="exam-layout">
        <header className="exam-header">
          <button className="btn btn--ghost" onClick={() => setViewing(null)}>
            ← Back to Review
          </button>
          <div className="exam-header__title">
            Reviewing Question {viewing + 1}{entry.flagged ? <Flag size={14} strokeWidth={2} style={{ marginLeft: 6, verticalAlign: 'middle' }} /> : ''}
          </div>
          <div className="exam-header__progress">
            {flaggedCount} flagged remaining
          </div>
        </header>
        <main className="exam-main">
          <Question
            question={entry.question}
            questionNumber={viewing + 1}
            totalQuestions={questionHistory.length}
            selected={entry.selectedAnswer}
            onSelect={(ans) => onUpdateAnswer(viewing, ans)}
            showResult={false}
            onNext={() => setViewing(null)}
            practiceMode={false}
            isFlagged={entry.flagged}
            onFlag={() => onToggleFlag(viewing)}
            nextLabel="Save & Back to Review"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="review-screen">
      <div className="review-screen__header">
        <h2>Review Before Submitting</h2>
        <div className="review-screen__summary">
          <span className="review-stat">{questionHistory.length} total</span>
          <span className="review-stat review-stat--answered">{answeredCount} answered</span>
          {unanswered > 0 && <span className="review-stat review-stat--warn">{unanswered} unanswered</span>}
          <span className="review-stat review-stat--flagged">{flaggedCount} flagged</span>
        </div>
        {flaggedCount > 0 && (
          <p className="review-screen__hint">
            Click any flagged question to review and optionally change your answer.
          </p>
        )}
      </div>

      <div className="review-grid">
        {questionHistory.map((entry, i) => {
          const hasAnswer = entry.selectedAnswer !== null;
          return (
            <div
              key={i}
              className={`review-cell ${entry.flagged ? 'review-cell--flagged' : ''} ${!hasAnswer ? 'review-cell--unanswered' : ''}`}
              onClick={() => entry.flagged && setViewing(i)}
              title={`Q${i + 1} · ${DOMAINS[entry.question.domain]}${entry.flagged ? ' · Flagged' : ''}${!hasAnswer ? ' · Unanswered' : ` · Answered: ${OPTION_LABELS[entry.selectedAnswer]}`}`}
            >
              <span className="review-cell__num">{i + 1}</span>
              {entry.flagged && <span className="review-cell__flag"><Flag size={11} strokeWidth={2} /></span>}
              {!hasAnswer && <span className="review-cell__dot review-cell__dot--empty" />}
              {hasAnswer && !entry.flagged && <span className="review-cell__dot review-cell__dot--filled" />}
            </div>
          );
        })}
      </div>

      {flaggedCount > 0 && (
        <div className="review-flagged-list">
          <h3>Flagged Questions</h3>
          {questionHistory.map((entry, i) => entry.flagged ? (
            <div key={i} className="flagged-item" onClick={() => setViewing(i)}>
              <span className="flagged-item__num">Q{i + 1}</span>
              <span className="flagged-item__domain">{DOMAINS[entry.question.domain]}</span>
              <span className="flagged-item__answer">
                {entry.selectedAnswer !== null ? `Answered: ${OPTION_LABELS[entry.selectedAnswer]}` : 'Unanswered'}
              </span>
              <button className="btn btn--secondary flagged-item__btn">Review →</button>
            </div>
          ) : null)}
        </div>
      )}

      <div className="review-screen__actions">
        {unanswered > 0 && (
          <p className="review-screen__warn">
            {unanswered} question{unanswered > 1 ? 's are' : ' is'} unanswered.
            Unanswered questions will be marked incorrect.
          </p>
        )}
        <button className="btn btn--primary btn--lg" onClick={onSubmit}>
          Submit Exam →
        </button>
      </div>
    </div>
  );
}
