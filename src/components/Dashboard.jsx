import { useState } from 'react';
import { getSessions, clearSessions } from '../utils/sessions.js';
import { DOMAINS } from '../data/questions.js';

function ScoreChart({ sessions }) {
  if (sessions.length < 2) {
    return <p className="chart-empty">Complete at least 2 sessions to see your trend.</p>;
  }
  const W = 560, H = 180, PAD = 32;
  const recent = sessions.slice(-20);
  const scores = recent.map(s => s.pct);
  const min = Math.max(0, Math.min(...scores) - 10);
  const max = Math.min(100, Math.max(...scores) + 10);

  function x(i) { return PAD + (i / (recent.length - 1)) * (W - PAD * 2); }
  function y(v) { return H - PAD - ((v - min) / (max - min)) * (H - PAD * 2); }

  const linePath = recent.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(s.pct)}`).join(' ');
  const passY = y(70);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="score-chart">
      {/* pass line */}
      <line x1={PAD} y1={passY} x2={W - PAD} y2={passY} stroke="#4caf5044" strokeDasharray="4 3" />
      <text x={W - PAD + 4} y={passY + 4} fill="#4caf5088" fontSize="10">70%</text>
      {/* score line */}
      <path d={linePath} fill="none" stroke="#5c6bc0" strokeWidth="2" strokeLinejoin="round" />
      {/* dots */}
      {recent.map((s, i) => (
        <circle key={i} cx={x(i)} cy={y(s.pct)} r={4}
          fill={s.mode === 'exam' ? '#5c6bc0' : '#81c784'}
          stroke="var(--surface)" strokeWidth="1.5">
          <title>{new Date(s.date).toLocaleDateString()} · {s.mode} · {s.pct}%{s.mode === 'exam' ? ` (${s.score})` : ''}</title>
        </circle>
      ))}
      {/* axis labels */}
      <text x={PAD} y={H - 8} fill="var(--text-muted)" fontSize="10">{new Date(recent[0].date).toLocaleDateString()}</text>
      <text x={W - PAD} y={H - 8} fill="var(--text-muted)" fontSize="10" textAnchor="end">{new Date(recent[recent.length - 1].date).toLocaleDateString()}</text>
    </svg>
  );
}

function DomainHeatmap({ sessions }) {
  if (sessions.length === 0) return null;

  // Aggregate domain performance across all sessions
  const totals = {};
  sessions.forEach(s => {
    Object.entries(s.domainBreakdown || {}).forEach(([dom, d]) => {
      if (!totals[dom]) totals[dom] = { correct: 0, total: 0 };
      totals[dom].correct += d.correct;
      totals[dom].total   += d.total;
    });
  });

  return (
    <div className="domain-heatmap">
      {Object.entries(DOMAINS).map(([num, name]) => {
        const d = totals[num];
        const pct = d && d.total > 0 ? Math.round((d.correct / d.total) * 100) : null;
        const level = pct === null ? 'none' : pct >= 75 ? 'great' : pct >= 60 ? 'ok' : pct >= 45 ? 'warn' : 'poor';
        return (
          <div key={num} className={`heat-cell heat-cell--${level}`}>
            <div className="heat-cell__num">{num}</div>
            <div className="heat-cell__name">{name}</div>
            <div className="heat-cell__pct">{pct !== null ? `${pct}%` : '—'}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard({ onHome }) {
  const [sessions, setSessions] = useState(() => getSessions());

  const examSessions     = sessions.filter(s => s.mode === 'exam');
  const practiceSessions = sessions.filter(s => s.mode === 'practice');
  const totalQs = sessions.reduce((sum, s) => sum + (s.total || 0), 0);
  const avgExam = examSessions.length
    ? Math.round(examSessions.reduce((s, e) => s + e.score, 0) / examSessions.length)
    : null;
  const recentExam = examSessions[examSessions.length - 1];

  function handleClear() {
    if (!confirm('Clear all session history? This cannot be undone.')) return;
    clearSessions();
    setSessions([]);
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <button className="btn btn--ghost" onClick={onHome}>← Home</button>
        <h2>Performance Dashboard</h2>
        {sessions.length > 0 && (
          <button className="btn-link" onClick={handleClear}>Clear history</button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="dashboard__empty">
          <div style={{ fontSize: 48 }}>📊</div>
          <h3>No sessions yet</h3>
          <p>Complete an exam or practice session to see your performance here.</p>
          <button className="btn btn--primary" onClick={onHome}>Start Studying</button>
        </div>
      ) : (
        <>
          <div className="dash-stats">
            <div className="dash-stat">
              <div className="dash-stat__val">{sessions.length}</div>
              <div className="dash-stat__label">Total Sessions</div>
            </div>
            <div className="dash-stat">
              <div className="dash-stat__val">{totalQs}</div>
              <div className="dash-stat__label">Questions Answered</div>
            </div>
            {avgExam !== null && (
              <div className="dash-stat">
                <div className={`dash-stat__val ${avgExam >= 700 ? 'dash-stat__val--pass' : 'dash-stat__val--fail'}`}>
                  {avgExam}
                </div>
                <div className="dash-stat__label">Avg Exam Score</div>
              </div>
            )}
            {recentExam && (
              <div className="dash-stat">
                <div className={`dash-stat__val ${recentExam.score >= 700 ? 'dash-stat__val--pass' : 'dash-stat__val--fail'}`}>
                  {recentExam.score}
                </div>
                <div className="dash-stat__label">Last Exam Score</div>
              </div>
            )}
          </div>

          <div className="dash-section">
            <h3>Score Trend
              <span className="chart-legend">
                <span className="legend-dot legend-dot--exam" /> Exam
                <span className="legend-dot legend-dot--practice" /> Practice
              </span>
            </h3>
            <ScoreChart sessions={sessions} />
          </div>

          <div className="dash-section">
            <h3>Domain Mastery (all-time)</h3>
            <div className="heatmap-legend">
              <span className="heat-legend heat-legend--great">≥75% Great</span>
              <span className="heat-legend heat-legend--ok">60–74% OK</span>
              <span className="heat-legend heat-legend--warn">45–59% Needs work</span>
              <span className="heat-legend heat-legend--poor">&lt;45% Focus here</span>
            </div>
            <DomainHeatmap sessions={sessions} />
          </div>

          <div className="dash-section">
            <h3>Recent Sessions</h3>
            <div className="session-list">
              {[...sessions].reverse().slice(0, 15).map(s => (
                <div key={s.id} className="session-row">
                  <span className={`session-row__mode session-row__mode--${s.mode}`}>{s.mode}</span>
                  <span className="session-row__date">{new Date(s.date).toLocaleDateString()}</span>
                  <span className="session-row__score">
                    {s.mode === 'exam'
                      ? <span className={s.score >= 700 ? 'text-pass' : 'text-fail'}>{s.score} {s.score >= 700 ? '✓' : '✗'}</span>
                      : `${s.pct}%`}
                  </span>
                  <span className="session-row__detail">{s.correct}/{s.total} correct</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
