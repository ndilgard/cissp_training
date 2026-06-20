import { DOMAINS } from '../data/questions.js';
import { getSessions } from '../utils/sessions.js';
import { getCustomQuestions } from '../utils/customQuestions.js';
import { getWrongIds } from '../utils/history.js';

export default function HomeScreen({ onExam, onPractice, onDashboard, onImport }) {
  const sessions   = getSessions();
  const customQs   = getCustomQuestions();
  const wrongCount = getWrongIds().size;
  const lastExam   = [...sessions].reverse().find(s => s.mode === 'exam');

  return (
    <div className="home">
      <div className="home__hero">
        <div className="home__badge">ISC²</div>
        <h1>CISSP Exam Simulator</h1>
        <p>Certified Information Systems Security Professional</p>
      </div>

      <div className="home__modes">
        <div className="mode-card mode-card--exam" onClick={onExam}>
          <div className="mode-card__icon">🎯</div>
          <h2>Exam Mode</h2>
          <p>Full CAT simulation · 100–150 adaptive questions · 3-hour timer · Pass/Fail verdict</p>
          <ul className="mode-card__features">
            <li>Adaptive difficulty tuned to your ability</li>
            <li>Flag questions &amp; review before submitting</li>
            <li>Scaled score out of 1000 (passing = 700)</li>
            <li>Domain performance breakdown</li>
          </ul>
          {lastExam && (
            <div className="mode-card__last">
              Last: <span className={lastExam.score >= 700 ? 'text-pass' : 'text-fail'}>
                {lastExam.score} {lastExam.score >= 700 ? '✓' : '✗'}
              </span>
            </div>
          )}
          <button className="btn btn--primary">Start Exam →</button>
        </div>

        <div className="mode-card mode-card--practice" onClick={onPractice}>
          <div className="mode-card__icon">📚</div>
          <h2>Practice Mode</h2>
          <p>Study at your own pace · filter by domain and difficulty · see explanations</p>
          <ul className="mode-card__features">
            <li>Wrong answers prioritized automatically</li>
            <li>Optional per-question countdown timer</li>
            <li>Filter by domain and difficulty</li>
            <li>Review your mistakes at the end</li>
          </ul>
          {wrongCount > 0 && (
            <div className="mode-card__last">
              <span className="badge-wrong">{wrongCount} questions need review</span>
            </div>
          )}
          <button className="btn btn--secondary">Start Practice →</button>
        </div>
      </div>

      <div className="home__tools">
        <button className="tool-btn" onClick={onDashboard}>
          <span className="tool-btn__icon">📊</span>
          <span>
            <strong>Dashboard</strong>
            <small>{sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded</small>
          </span>
        </button>
        <button className="tool-btn" onClick={onImport}>
          <span className="tool-btn__icon">📥</span>
          <span>
            <strong>Import Questions</strong>
            <small>{customQs.length > 0 ? `${customQs.length} custom loaded` : 'Add your own question bank'}</small>
          </span>
        </button>
      </div>

      <div className="home__domains">
        <h3>8 CISSP Domains Covered</h3>
        <div className="domain-chips">
          {Object.entries(DOMAINS).map(([num, name]) => (
            <span key={num} className="domain-chip">
              <span className="domain-chip__num">{num}</span> {name}
            </span>
          ))}
        </div>
      </div>

      <div className="home__disclaimer">
        <strong>Note:</strong> This simulator uses AI-generated practice questions for study purposes.
        It is not affiliated with ISC² and does not contain official exam content.
      </div>
    </div>
  );
}
