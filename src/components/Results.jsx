import { DOMAINS } from '../data/questions.js';
import { getDomainBreakdown } from '../utils/cat.js';

export default function Results({ answered, scaledScore, isPractice, onRestart, onHome, onWrongReview }) {
  const passed = !isPractice && scaledScore >= 700;
  const breakdown = getDomainBreakdown(answered);
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

      {wrongCount > 0 && (
        <div className="results__advice">
          {!isPractice && !passed && (
            <>
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
            </>
          )}
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
