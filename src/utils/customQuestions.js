const KEY = 'cissp_custom_questions';

export function getCustomQuestions() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function saveCustomQuestions(questions) {
  localStorage.setItem(KEY, JSON.stringify(questions));
}

export function clearCustomQuestions() {
  localStorage.removeItem(KEY);
}

// Validate a question object matches our schema
function isValid(q) {
  return (
    q.domain >= 1 && q.domain <= 8 &&
    q.difficulty >= 1 && q.difficulty <= 3 &&
    typeof q.question === 'string' && q.question.length > 0 &&
    Array.isArray(q.options) && q.options.length === 4 &&
    q.answer >= 0 && q.answer <= 3
  );
}

// Parse JSON array of questions, return { questions, errors }
export function parseJSON(text) {
  try {
    const raw = JSON.parse(text);
    if (!Array.isArray(raw)) return { questions: [], errors: ['File must be a JSON array'] };
    const questions = [];
    const errors = [];
    raw.forEach((q, i) => {
      const norm = {
        id: q.id || `custom_${Date.now()}_${i}`,
        domain: Number(q.domain),
        difficulty: Number(q.difficulty) || 2,
        question: String(q.question || ''),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        answer: typeof q.answer === 'string'
          ? 'ABCD'.indexOf(q.answer.toUpperCase())
          : Number(q.answer),
        explanation: String(q.explanation || ''),
      };
      if (isValid(norm)) questions.push(norm);
      else errors.push(`Row ${i + 1}: invalid or missing required fields`);
    });
    return { questions, errors };
  } catch (e) {
    return { questions: [], errors: [`JSON parse error: ${e.message}`] };
  }
}

// Parse CSV — expected columns:
// question, optionA, optionB, optionC, optionD, answer (A-D or 0-3), explanation, domain, difficulty
export function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { questions: [], errors: ['CSV must have a header row and at least one data row'] };
  const questions = [];
  const errors = [];
  lines.slice(1).forEach((line, i) => {
    const cols = parseCSVLine(line);
    if (cols.length < 8) { errors.push(`Row ${i + 2}: not enough columns`); return; }
    const [question, a, b, c, d, answerRaw, explanation, domainRaw, diffRaw] = cols;
    const answerIdx = /^[0-9]$/.test(answerRaw.trim())
      ? Number(answerRaw.trim())
      : 'ABCD'.indexOf(answerRaw.trim().toUpperCase());
    const norm = {
      id: `custom_${Date.now()}_${i}`,
      domain: Number(domainRaw) || 1,
      difficulty: Number(diffRaw) || 2,
      question: question.trim(),
      options: [a.trim(), b.trim(), c.trim(), d.trim()],
      answer: answerIdx,
      explanation: (explanation || '').trim(),
    };
    if (isValid(norm)) questions.push(norm);
    else errors.push(`Row ${i + 2}: invalid fields (domain=${domainRaw}, diff=${diffRaw}, answer=${answerRaw})`);
  });
  return { questions, errors };
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}
