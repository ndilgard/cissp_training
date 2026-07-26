// All prep-progress state lives only in localStorage — this lets it survive
// a cache clear, browser reinstall, or moving to a different device.
const BACKUP_KEYS = [
  'cissp_seen_questions',
  'cissp_wrong_answers',
  'cissp_custom_questions',
  'cissp_sessions',
  'cissp_flashcard_progress',
];

export function getBackupSummary() {
  try {
    return {
      seen: JSON.parse(localStorage.getItem('cissp_seen_questions') || '[]')
        .length,
      wrong: Object.keys(
        JSON.parse(localStorage.getItem('cissp_wrong_answers') || '{}'),
      ).length,
      sessions: JSON.parse(localStorage.getItem('cissp_sessions') || '[]')
        .length,
      custom: JSON.parse(localStorage.getItem('cissp_custom_questions') || '[]')
        .length,
    };
  } catch {
    return { seen: 0, wrong: 0, sessions: 0, custom: 0 };
  }
}

export function exportBackup() {
  const data = {};
  BACKUP_KEYS.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val !== null) data[key] = val;
  });

  const payload = {
    app: 'cissp-exam-simulator',
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cissp-progress-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Returns { success, error? }. Overwrites matching keys — caller should confirm first.
export function importBackup(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { success: false, error: 'That file is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.data) {
    return {
      success: false,
      error: 'That does not look like a CISSP progress backup file.',
    };
  }
  BACKUP_KEYS.forEach((key) => {
    if (typeof parsed.data[key] === 'string') {
      localStorage.setItem(key, parsed.data[key]);
    }
  });
  return { success: true };
}
