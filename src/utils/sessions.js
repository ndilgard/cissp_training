const KEY = 'cissp_sessions';
const MAX_SESSIONS = 50;

export function getSessions() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

// session: { mode, score, pct, correct, total, domainBreakdown }
export function saveSession(session) {
  const sessions = getSessions();
  sessions.push({ ...session, id: Date.now(), date: new Date().toISOString() });
  // Keep only the most recent MAX_SESSIONS
  const trimmed = sessions.slice(-MAX_SESSIONS);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
}

export function clearSessions() {
  localStorage.removeItem(KEY);
}
