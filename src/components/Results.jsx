import { useState } from 'react';
import { DOMAINS } from '../data/questions.js';
import { getDomainBreakdown, getDifficultyBreakdown } from '../utils/cat.js';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const DIFF_LABELS = { 1: 'Foundation', 2: 'Intermediate', 3: 'Advanced' };

function ReviewAccordion({ questionHistory }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="exam-review-list">
      {questionHistory.map((entry, i) => {
        const q = entry.question;
        const userAns = entry.selectedAnswer;
        const correct = userAns === q.answer;
        return (
          <div key={i} className={`era-item ${correct ? 'era-item--correct' : 'era-item--wrong'}`}>
            <button className="era-item__toggle" onClick={() => setOpen(open === i ? null : i)}>
              <span className="era-item__num">Q{i + 1}</span>
              <span className="era-item__domain">{DOMAINS[q.domain]}</span>
              <span className={`era-item__verdict era-item__verdict--${correct ? 'pass' : 'fail'}`}>
                {correct ? '✓' : '✗'}
              </span>
              <span className="era-item__chevron">{open === i ? '▲' : '▼'}</span>
            </button>
            {open === i && (
              <div className="era-item__body">
                <p className="era-item__qtext">{q.question}</p>
                <ol className="era-item__options">
                  {q.options.map((opt, j) => {
                    let cls = 'era-option';
                    if (j === q.answer) cls += ' era-option--correct';
                    else if (j === userAns) cls += ' era-option--wrong';
                    return (
                      <li key={j} className={cls}>
                        <span className="era-option__label">{OPTION_LABELS[j]}.</span>
                        <span>{opt}</span>
                      </li>
                    );
                  })}
                </ol>
                <div className="era-item__explanation">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Results({
  answered,
  scaledScore,
  isPractice,
  onRestart,
  onHome,
  onWrongReview,
  questionHistory = null,
}) {
  const [showReview, setShowReview] = useState(false);

  const passed = !isPractice && scaledScore >= 700;
  const breakdown = getDomainBreakdown(answered);
  const diffBreakdown = getDifficultyBreakdown(answered);
  const totalCorrect = answered.filter(a => a.correct).length;
  const pct = Math.round((totalCorrect / answered.length) * 100);
  const wrongCount = answered.filter(a => !a.correct).length;

  return (
    <div className="results">
      <div className={`results__verdict ${isPractice ? 'results__verdict--practice' : passed ? 'results__verdict--pass' : 'results__verdict--fail'}`}>
        {isPractice ? (
          <>
            <div className="results__grade">{pct}%</div>
            <div className="results__label">Practice Score</div>
            <div className="results__detail">{totalCorrect} / {answered.length} correct</div>
          </>
        ) : (
          <>
            <div className="results__grade">{scaledScore}</div>
            <div className="results__label">{passed ? '✓ PASS' : '✗ DID NOT PASS'}</div>
            <div className="results__detail">
              Scaled score · passing = 700 · {totalCorrect}/{answered.length} correct ({pct}%)
            </div>
          </>
        )}
      </div>

      <div className="results__breakdown">
        <h3>Domain Performance</h3>
        <div className="domain-grid">
          {Object.entries(DOMAINS).map(([domainNum, name]) => {
            const d = breakdown[domainNum] || { correct: 0, total: 0 };
            const domainPct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : null;
            const barColor = domainPct === null ? '#555'
              : domainPct >= 70 ? '#4caf50'
              : domainPct >= 50 ? '#ff9800'
              : '#f44336';
            return (
              <div key={domainNum} className="domain-row">
                <div className="domain-row__name">{name}</div>
                <div className="domain-row__bar-wrap">
                  <div className="domain-row__bar"
                    style={{ width: domainPct !== null ? `${domainPct}%` : '0%', background: barColor }} />
                </div>
                <div className="domain-row__score">
                  {d.total > 0 ? `${d.correct}/${d.total} (${domainPct}%)` : 'Not tested'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="results__breakdown">
        <h3>Performance by Difficulty</h3>
        <div className="diff-stats">
          {[1, 2, 3].map(level => {
            const d = diffBreakdown[level] || { correct: 0, total: 0 };
            const levelPct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : null;
            return (
              <div key={level} className={`diff-stat diff-stat--${level}`}>
                <div className="diff-stat__label">{DIFF_LABELS[level]}</div>
                <div className="diff-stat__score">
                  {d.total > 0 ? `${d.correct}/${d.total}` : '—'}
                </div>
                <div className="diff-stat__pct">
                  {levelPct !== null ? `${levelPct}%` : 'Not tested'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {wrongCount > 0 && !isPractice && !passed && (
        <div className="results__advice">
          <h4>Weak Domains</h4>
          <ul>
            {Object.entries(breakdown)
              .filter(([, d]) => d.total > 0 && d.correct / d.total < 0.6)
              .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
              .map(([dom, d]) => (
                <li key={dom}>
                  <strong>{DOMAINS[dom]}</strong> — {Math.round((d.correct / d.total) * 100)}% correct
                </li>
              ))}
          </ul>
        </div>
      )}

      {questionHistory && questionHistory.length > 0 && (
        <div className="results__breakdown">
          <button
            className="btn btn--secondary results__review-toggle"
            onClick={() => setShowReview(v => !v)}
          >
            {showReview
              ? `Hide Question Review ▲`
              : `Review All ${questionHistory.length} Questions ▼`}
          </button>
          {showReview && <ReviewAccordion questionHistory={questionHistory} />}
        </div>
      )}

      <div className="results__actions">
        {onWrongReview && wrongCount > 0 && (
          <button className="btn btn--warn" onClick={onWrongReview}>
            Review {wrongCount} Wrong Answer{wrongCount > 1 ? 's' : ''} →
          </button>
        )}
        <button className="btn btn--secondary" onClick={onRestart}>
          {isPractice ? 'New Session' : 'Retake Exam'}
        </button>
        <button className="btn btn--primary" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}
