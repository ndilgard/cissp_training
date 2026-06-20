import { useState, useRef } from 'react';
import { getCustomQuestions, saveCustomQuestions, clearCustomQuestions, parseJSON, parseCSV } from '../utils/customQuestions.js';

const JSON_EXAMPLE = `[
  {
    "domain": 1,
    "difficulty": 2,
    "question": "Your question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Why A is correct."
  }
]`;

const CSV_EXAMPLE = `question,optionA,optionB,optionC,optionD,answer,explanation,domain,difficulty
Your question?,Option A,Option B,Option C,Option D,A,Explanation here.,1,2`;

export default function QuestionImport({ onHome }) {
  const [customQs, setCustomQs]   = useState(() => getCustomQuestions());
  const [tab, setTab]             = useState('upload'); // 'upload' | 'paste' | 'format'
  const [pasteText, setPasteText] = useState('');
  const [pasteType, setPasteType] = useState('json');
  const [errors, setErrors]       = useState([]);
  const [success, setSuccess]     = useState('');
  const fileRef = useRef(null);

  function processText(text, type) {
    setErrors([]);
    setSuccess('');
    const { questions: parsed, errors: errs } = type === 'json' ? parseJSON(text) : parseCSV(text);
    if (errs.length > 0 && parsed.length === 0) {
      setErrors(errs);
      return;
    }
    const existing = getCustomQuestions();
    const merged = [...existing, ...parsed];
    saveCustomQuestions(merged);
    setCustomQs(merged);
    setSuccess(`${parsed.length} question${parsed.length > 1 ? 's' : ''} imported successfully!${errs.length > 0 ? ` (${errs.length} skipped due to errors)` : ''}`);
    if (errs.length > 0) setErrors(errs);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const type = file.name.endsWith('.csv') ? 'csv' : 'json';
    const reader = new FileReader();
    reader.onload = ev => processText(ev.target.result, type);
    reader.readAsText(file);
    e.target.value = '';
  }

  function handlePaste() {
    if (!pasteText.trim()) return;
    processText(pasteText.trim(), pasteType);
  }

  function handleClear() {
    if (!confirm(`Remove all ${customQs.length} imported questions?`)) return;
    clearCustomQuestions();
    setCustomQs([]);
    setSuccess('Imported questions cleared.');
    setErrors([]);
  }

  return (
    <div className="import-screen">
      <div className="import-screen__header">
        <button className="btn btn--ghost" onClick={onHome}>← Home</button>
        <h2>Import Questions</h2>
      </div>

      {customQs.length > 0 && (
        <div className="import-current">
          <span>{customQs.length} custom question{customQs.length > 1 ? 's' : ''} loaded</span>
          <button className="btn-link text-fail" onClick={handleClear}>Remove all</button>
        </div>
      )}

      <div className="import-tabs">
        {['upload', 'paste', 'format'].map(t => (
          <button key={t} className={`import-tab ${tab === t ? 'import-tab--active' : ''}`} onClick={() => setTab(t)}>
            {t === 'upload' ? 'Upload File' : t === 'paste' ? 'Paste Text' : 'Format Guide'}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <div className="import-body">
          <p>Upload a <strong>.json</strong> or <strong>.csv</strong> file matching the format below.</p>
          <input ref={fileRef} type="file" accept=".json,.csv" style={{ display: 'none' }} onChange={handleFile} />
          <button className="btn btn--secondary btn--full" onClick={() => fileRef.current.click()}>
            Choose File (.json or .csv)
          </button>
        </div>
      )}

      {tab === 'paste' && (
        <div className="import-body">
          <div className="form-group">
            <label>Format</label>
            <select value={pasteType} onChange={e => setPasteType(e.target.value)}>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <textarea
            className="import-textarea"
            placeholder={pasteType === 'json' ? JSON_EXAMPLE : CSV_EXAMPLE}
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={10}
          />
          <button className="btn btn--primary btn--full" onClick={handlePaste} disabled={!pasteText.trim()}>
            Import
          </button>
        </div>
      )}

      {tab === 'format' && (
        <div className="import-body">
          <h4>JSON Format</h4>
          <pre className="import-example">{JSON_EXAMPLE}</pre>
          <h4 style={{ marginTop: 24 }}>CSV Format</h4>
          <pre className="import-example">{CSV_EXAMPLE}</pre>
          <div className="import-notes">
            <p><strong>domain:</strong> 1–8 (CISSP domain number)</p>
            <p><strong>difficulty:</strong> 1 = Foundation, 2 = Intermediate, 3 = Advanced</p>
            <p><strong>answer (JSON):</strong> 0-based index (0=A, 1=B, 2=C, 3=D)</p>
            <p><strong>answer (CSV):</strong> A, B, C, D or 0, 1, 2, 3</p>
            <p><strong>explanation:</strong> optional but recommended</p>
          </div>
        </div>
      )}

      {success && <div className="import-success">{success}</div>}
      {errors.length > 0 && (
        <div className="import-errors">
          <strong>Issues ({errors.length}):</strong>
          <ul>{errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>
          {errors.length > 10 && <p>…and {errors.length - 10} more</p>}
        </div>
      )}
    </div>
  );
}
