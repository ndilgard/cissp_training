// Primary storage is localStorage, which does NOT survive a browser data
// clear, reinstall, or an unclean shutdown corrupting the browser's storage
// file. Two safety nets on top of it:
//  - autoSaveToDisk/autoRestoreFromDisk below: the dev server (vite.config.js)
//    mirrors this to a file on disk and the app restores from it if
//    localStorage comes back empty. Automatic, but local-machine-only.
//  - exportBackup/importBackup: manual, portable to another device.
const BACKUP_KEYS = [
  'cissp_seen_questions',
  'cissp_wrong_answers',
  'cissp_custom_questions',
  'cissp_sessions',
  'cissp_flashcard_progress',
];

function snapshotBackupData() {
  const data = {};
  BACKUP_KEYS.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val !== null) data[key] = val;
  });
  return data;
}

const AUTO_BACKUP_URL = '/api/progress-backup';
let saveTimer = null;

// Debounced, best-effort mirror to the dev server's on-disk copy. No-ops
// silently if the endpoint isn't available (e.g. a production build with no
// dev server behind it).
export function scheduleAutoSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch(AUTO_BACKUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'cissp-exam-simulator',
        savedAt: new Date().toISOString(),
        data: snapshotBackupData(),
      }),
    }).catch(() => {});
  }, 1000);
}

// Called once at startup, before the app renders. Fills in any BACKUP_KEYS
// missing from localStorage from the disk copy — never overwrites data
// that's already present, so it only kicks in when localStorage came back
// empty (the failure mode this exists for).
export async function autoRestoreFromDisk() {
  try {
    const res = await fetch(AUTO_BACKUP_URL);
    if (!res.ok) return;
    const payload = await res.json();
    if (!payload?.data) return;
    BACKUP_KEYS.forEach((key) => {
      if (
        localStorage.getItem(key) === null &&
        typeof payload.data[key] === 'string'
      ) {
        localStorage.setItem(key, payload.data[key]);
      }
    });
  } catch {
    // Dev server not running, or no backup saved yet — nothing to restore.
  }
}

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
  const payload = {
    app: 'cissp-exam-simulator',
    exportedAt: new Date().toISOString(),
    data: snapshotBackupData(),
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
