import { useState, useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { getSessions, clearSessions } from '../utils/sessions.js';
import { DOMAINS, DOMAIN_WEIGHTS } from '../data/questions.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function aggregateDomains(sessions) {
  const totals = {};
  sessions.forEach((s) => {
    Object.entries(s.domainBreakdown || {}).forEach(([dom, d]) => {
      if (!totals[dom]) totals[dom] = { correct: 0, total: 0 };
      totals[dom].correct += d.correct;
      totals[dom].total += d.total;
    });
  });
  return totals;
}

function aggregateDifficulty(sessions) {
  const totals = {};
  sessions.forEach((s) => {
    Object.entries(s.difficultyBreakdown || {}).forEach(([diff, d]) => {
      if (!totals[diff]) totals[diff] = { correct: 0, total: 0 };
      totals[diff].correct += d.correct;
      totals[diff].total += d.total;
    });
  });
  return totals;
}

function calcReadiness(domainTotals) {
  let weighted = 0;
  let totalW = 0;
  Object.entries(DOMAIN_WEIGHTS).forEach(([dom, w]) => {
    const d = domainTotals[dom];
    const pct = d && d.total > 0 ? d.correct / d.total : 0;
    weighted += pct * w;
    totalW += w;
  });
  return totalW > 0 ? Math.round((weighted / totalW) * 100) : 0;
}

function calcStreak(sessions) {
  if (!sessions.length) return 0;
  const dates = [...new Set(sessions.map((s) => s.date.split('T')[0]))]
    .sort()
    .reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 0;
  let cursor = dates[0];
  for (const date of dates) {
    if (date === cursor) {
      streak++;
      const d = new Date(cursor + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      cursor = d.toISOString().split('T')[0];
    } else {
      break;
    }
  }
  return streak;
}

function readinessLabel(pct) {
  if (pct < 20) return { label: 'Just Starting', color: '#e57373' };
  if (pct < 45) return { label: 'Early Stages', color: '#ff8a65' };
  if (pct < 60) return { label: 'Building Knowledge', color: '#ffb74d' };
  if (pct < 72) return { label: 'On Track', color: '#ffd54f' };
  if (pct < 82) return { label: 'Nearly Ready', color: '#aed581' };
  return { label: 'Exam Ready!', color: '#81c784' };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ReadinessCard({ sessions }) {
  const domainTotals = useMemo(() => aggregateDomains(sessions), [sessions]);
  const pct = calcReadiness(domainTotals);
  const { label, color } = readinessLabel(pct);
  const domainsWithData = Object.values(domainTotals).filter(
    (d) => d.total > 0,
  ).length;

  return (
    <div className="readiness-card">
      <div className="readiness-card__left">
        <div className="readiness-label">EXAM READINESS</div>
        <div className="readiness-score-num" style={{ color }}>
          {pct}%
        </div>
        <div className="readiness-status" style={{ color }}>
          {label}
        </div>
        <div className="readiness-bar-track">
          <div
            className="readiness-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
          <div
            className="readiness-bar-target"
            style={{ left: '70%' }}
            title="70% passing target"
          />
        </div>
        <div className="readiness-sub">
          Weighted across {domainsWithData}/8 CISSP domains · 70% to pass
        </div>
      </div>
      <div className="readiness-card__right">
        {Object.entries(DOMAINS).map(([num, name]) => {
          const d = domainTotals[num];
          const p =
            d && d.total > 0 ? Math.round((d.correct / d.total) * 100) : null;
          const dot =
            p === null
              ? '#555'
              : p >= 70
                ? '#81c784'
                : p >= 55
                  ? '#ffb74d'
                  : '#e57373';
          return (
            <div key={num} className="readiness-domain-row">
              <span
                className="readiness-domain-dot"
                style={{ background: dot }}
              />
              <span className="readiness-domain-name">D{num}</span>
              <span className="readiness-domain-pct" style={{ color: dot }}>
                {p !== null ? `${p}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ value, label, sub, valueClass }) {
  return (
    <div className="dash-stat">
      <div className={`dash-stat__val ${valueClass || ''}`}>{value}</div>
      <div className="dash-stat__label">{label}</div>
      {sub && <div className="dash-stat__sub">{sub}</div>}
    </div>
  );
}

function ScoreChart({ sessions }) {
  if (sessions.length < 2) {
    return (
      <p className="chart-empty">
        Complete at least 2 sessions to see your trend.
      </p>
    );
  }
  const W = 560,
    H = 180,
    PAD = 32;
  const recent = sessions.slice(-20);
  const scores = recent.map((s) => s.pct);
  const min = Math.max(0, Math.min(...scores) - 10);
  const max = Math.min(100, Math.max(...scores) + 10);

  function x(i) {
    return PAD + (i / (recent.length - 1)) * (W - PAD * 2);
  }
  function y(v) {
    return H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  }

  const linePath = recent
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(s.pct)}`)
    .join(' ');
  const passY = y(70);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="score-chart">
      <line
        x1={PAD}
        y1={passY}
        x2={W - PAD}
        y2={passY}
        stroke="#4caf5044"
        strokeDasharray="4 3"
      />
      <text x={W - PAD + 4} y={passY + 4} fill="#4caf5088" fontSize="10">
        70%
      </text>
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {recent.map((s, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(s.pct)}
          r={4}
          fill={s.mode === 'exam' ? 'var(--accent)' : '#81c784'}
          stroke="var(--surface)"
          strokeWidth="1.5"
        >
          <title>
            {new Date(s.date).toLocaleDateString()} · {s.mode} · {s.pct}%
          </title>
        </circle>
      ))}
      <text x={PAD} y={H - 8} fill="var(--text-muted)" fontSize="10">
        {new Date(recent[0].date).toLocaleDateString()}
      </text>
      <text
        x={W - PAD}
        y={H - 8}
        fill="var(--text-muted)"
        fontSize="10"
        textAnchor="end"
      >
        {new Date(recent[recent.length - 1].date).toLocaleDateString()}
      </text>
    </svg>
  );
}

function DomainBars({ sessions }) {
  const totals = useMemo(() => aggregateDomains(sessions), [sessions]);

  return (
    <div className="domain-bars">
      {Object.entries(DOMAINS).map(([num, name]) => {
        const d = totals[num];
        const pct =
          d && d.total > 0 ? Math.round((d.correct / d.total) * 100) : null;
        const color =
          pct === null
            ? 'var(--border)'
            : pct >= 75
              ? '#81c784'
              : pct >= 60
                ? '#ffd54f'
                : pct >= 45
                  ? '#ffb74d'
                  : '#e57373';
        return (
          <div key={num} className="domain-bar-row">
            <div className="domain-bar-label">
              <span className="domain-bar-num">D{num}</span>
              <span className="domain-bar-name">{name}</span>
            </div>
            <div className="domain-bar-track">
              <div
                className="domain-bar-fill"
                style={{
                  width: pct !== null ? `${pct}%` : '0%',
                  background: color,
                }}
              />
              <div className="domain-bar-target" title="75% target" />
            </div>
            <div className="domain-bar-pct" style={{ color }}>
              {pct !== null ? `${pct}%` : '—'}
              {d && <span className="domain-bar-count"> ({d.total}q)</span>}
            </div>
          </div>
        );
      })}
      <div className="domain-bar-legend">
        <span className="dbl dbl--great">≥75% Great</span>
        <span className="dbl dbl--ok">60–74% OK</span>
        <span className="dbl dbl--warn">45–59% Review</span>
        <span className="dbl dbl--poor">&lt;45% Focus</span>
        <span className="dbl dbl--target">— 75% target</span>
      </div>
    </div>
  );
}

function DiffBreakdown({ sessions }) {
  const totals = useMemo(() => aggregateDifficulty(sessions), [sessions]);
  const hasDiff = Object.keys(totals).length > 0;
  const LABELS = { 1: 'Foundation', 2: 'Intermediate', 3: 'Advanced' };
  const COLORS = { 1: '#81c784', 2: '#ffd54f', 3: '#ff8a65' };

  if (!hasDiff)
    return (
      <p className="chart-empty">
        Complete a session to see difficulty breakdown.
      </p>
    );

  return (
    <div className="diff-breakdown">
      {[1, 2, 3].map((diff) => {
        const d = totals[diff];
        const pct =
          d && d.total > 0 ? Math.round((d.correct / d.total) * 100) : null;
        return (
          <div key={diff} className="diff-row">
            <div className="diff-row__label">{LABELS[diff]}</div>
            <div className="diff-row__track">
              <div
                className="diff-row__fill"
                style={{
                  width: pct !== null ? `${pct}%` : '0%',
                  background: COLORS[diff],
                }}
              />
            </div>
            <div className="diff-row__pct" style={{ color: COLORS[diff] }}>
              {pct !== null ? `${pct}%` : '—'}
              {d && <span className="diff-row__count"> ({d.total}q)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Recommendations({ sessions }) {
  const totals = useMemo(() => aggregateDomains(sessions), [sessions]);

  const ranked = Object.entries(DOMAINS)
    .map(([num, name]) => {
      const d = totals[num];
      const pct =
        d && d.total > 0 ? Math.round((d.correct / d.total) * 100) : null;
      return { num, name, pct, total: d?.total || 0 };
    })
    .sort((a, b) => {
      if (a.pct === null && b.pct === null) return 0;
      if (a.pct === null) return -1;
      if (b.pct === null) return 1;
      return a.pct - b.pct;
    })
    .slice(0, 3);

  function message(pct, total) {
    if (pct === null) return 'No questions attempted yet — start here.';
    if (total < 10)
      return `Only ${total} questions attempted — increase coverage.`;
    if (pct < 45) return 'Struggling here — review core concepts and retry.';
    if (pct < 60) return 'Below passing threshold — focused practice needed.';
    if (pct < 75)
      return 'Close to target — a few more sessions will get you there.';
    return 'Solid — maintain with occasional review.';
  }

  const colors = ['#e57373', '#ffb74d', '#ffd54f'];

  return (
    <div className="rec-grid">
      {ranked.map(({ num, name, pct, total }, i) => (
        <div key={num} className="rec-card">
          <div className="rec-card__accent" style={{ background: colors[i] }} />
          <div className="rec-card__body">
            <div className="rec-card__domain">Domain {num}</div>
            <div className="rec-card__name">{name}</div>
            <div
              className="rec-card__pct"
              style={{ color: pct === null ? 'var(--text-muted)' : colors[i] }}
            >
              {pct !== null ? `${pct}% accuracy` : 'Not started'}
            </div>
            <div className="rec-card__msg">{message(pct, total)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard({ onHome }) {
  const [sessions, setSessions] = useState(() => getSessions());

  const examSessions = sessions.filter((s) => s.mode === 'exam');
  const totalQs = sessions.reduce((sum, s) => sum + (s.total || 0), 0);
  const streak = useMemo(() => calcStreak(sessions), [sessions]);
  const avgExam = examSessions.length
    ? Math.round(
        examSessions.reduce((s, e) => s + e.score, 0) / examSessions.length,
      )
    : null;
  const recentExam = examSessions[examSessions.length - 1];
  const passCount = examSessions.filter((s) => s.score >= 700).length;
  const passRate = examSessions.length
    ? Math.round((passCount / examSessions.length) * 100)
    : null;

  function handleClear() {
    if (!confirm('Clear all session history? This cannot be undone.')) return;
    clearSessions();
    setSessions([]);
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <button className="btn btn--ghost" onClick={onHome}>
          ← Home
        </button>
        <h2>Performance Dashboard</h2>
        {sessions.length > 0 && (
          <button className="btn-link" onClick={handleClear}>
            Clear history
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="dashboard__empty">
          <BarChart2
            size={48}
            strokeWidth={1.25}
            style={{ color: 'var(--text-muted)' }}
          />
          <h3>No sessions yet</h3>
          <p>
            Complete an exam or practice session to see your analytics here.
          </p>
          <button className="btn btn--primary" onClick={onHome}>
            Start Studying
          </button>
        </div>
      ) : (
        <>
          <ReadinessCard sessions={sessions} />

          <div className="dash-stats">
            <StatCard value={sessions.length} label="Total Sessions" />
            <StatCard
              value={totalQs.toLocaleString()}
              label="Questions Answered"
            />
            <StatCard
              value={streak > 0 ? `${streak}d` : '—'}
              label="Study Streak"
              sub={streak > 0 ? 'Keep it up!' : 'Start today'}
            />
            {passRate !== null && (
              <StatCard
                value={`${passRate}%`}
                label="Exam Pass Rate"
                valueClass={
                  passRate >= 70
                    ? 'dash-stat__val--pass'
                    : 'dash-stat__val--fail'
                }
                sub={`${passCount}/${examSessions.length} exams`}
              />
            )}
            {avgExam !== null && (
              <StatCard
                value={avgExam}
                label="Avg Exam Score"
                valueClass={
                  avgExam >= 700
                    ? 'dash-stat__val--pass'
                    : 'dash-stat__val--fail'
                }
              />
            )}
            {recentExam && (
              <StatCard
                value={recentExam.score}
                label="Last Exam Score"
                valueClass={
                  recentExam.score >= 700
                    ? 'dash-stat__val--pass'
                    : 'dash-stat__val--fail'
                }
              />
            )}
          </div>

          <div className="dash-section">
            <h3>
              Score Trend
              <span className="chart-legend">
                <span className="legend-dot legend-dot--exam" /> Exam
                <span className="legend-dot legend-dot--practice" /> Practice
              </span>
            </h3>
            <ScoreChart sessions={sessions} />
          </div>

          <div className="dash-section">
            <h3>Domain Performance</h3>
            <DomainBars sessions={sessions} />
          </div>

          <div className="dash-section">
            <h3>Difficulty Breakdown</h3>
            <DiffBreakdown sessions={sessions} />
          </div>

          <div className="dash-section">
            <h3>Study Recommendations</h3>
            <p className="rec-sub">
              Your lowest-performing domains — focus here next.
            </p>
            <Recommendations sessions={sessions} />
          </div>

          <div className="dash-section">
            <h3>Recent Sessions</h3>
            <div className="session-list">
              {[...sessions]
                .reverse()
                .slice(0, 15)
                .map((s) => (
                  <div key={s.id} className="session-row">
                    <span
                      className={`session-row__mode session-row__mode--${s.mode}`}
                    >
                      {s.mode}
                    </span>
                    <span className="session-row__date">
                      {new Date(s.date).toLocaleDateString()}
                    </span>
                    <span className="session-row__score">
                      {s.mode === 'exam' ? (
                        <span
                          className={s.score >= 700 ? 'text-pass' : 'text-fail'}
                        >
                          {s.score} {s.score >= 700 ? '✓' : '✗'}
                        </span>
                      ) : (
                        `${s.pct}%`
                      )}
                    </span>
                    <span className="session-row__detail">
                      {s.correct}/{s.total} correct
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
