import { useRef, useState } from 'react';
import {
  exportBackup,
  getBackupSummary,
  importBackup,
} from '../utils/backup.js';

export default function BackupRestore({ onHome }) {
  const summary = getBackupSummary();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  function handleExport() {
    exportBackup();
    setMessage('Backup file downloaded.');
    setError('');
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const proceed = confirm(
      'Importing will overwrite your current seen questions, wrong-answer history, sessions, ' +
        "custom questions, and flashcard progress with what's in this file. Continue?",
    );
    if (!proceed) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = importBackup(ev.target.result);
      if (result.success) {
        setMessage('Backup restored. Reloading…');
        setError('');
        setTimeout(() => window.location.reload(), 800);
      } else {
        setError(result.error);
        setMessage('');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="import-screen">
      <div className="import-screen__header">
        <button className="btn btn--ghost" onClick={onHome}>
          ← Home
        </button>
        <h2>Backup &amp; Restore</h2>
      </div>

      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.92rem',
          lineHeight: 1.6,
        }}
      >
        Progress lives in this browser, with an automatic backup to disk on
        this machine (via the dev server) that restores itself if the
        browser's storage ever gets wiped. Switching devices or moving off
        this machine still requires exporting a backup file first.
      </p>

      <div className="import-current">
        <span>
          {summary.seen} seen &middot; {summary.wrong} to review &middot;{' '}
          {summary.sessions} sessions &middot; {summary.custom} custom questions
        </span>
      </div>

      <div className="import-body">
        <h4>Export</h4>
        <p>
          Download everything as a JSON file you can keep somewhere safe (cloud
          drive, email to yourself, etc).
        </p>
        <button className="btn btn--primary btn--full" onClick={handleExport}>
          Download Backup File
        </button>
      </div>

      <div className="import-body" style={{ marginTop: 24 }}>
        <h4>Restore</h4>
        <p>
          Load a previously downloaded backup file. This{' '}
          <strong>overwrites</strong> your current progress on this device.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <button
          className="btn btn--secondary btn--full"
          onClick={() => fileRef.current.click()}
        >
          Choose Backup File to Restore
        </button>
      </div>

      {message && <div className="import-success">{message}</div>}
      {error && (
        <div className="import-errors">
          <strong>{error}</strong>
        </div>
      )}
    </div>
  );
}
