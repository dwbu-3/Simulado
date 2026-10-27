// Validação completa do CSV de questões e do JSON de gabarito. Mensagens em português.
import { parseCSV, detectDelimiter } from "./csv-parser.js";

export const LETTERS = ["A", "B", "C", "D", "E"];
export const SUPPORTED_SCHEMA = "1.0";
const REQUIRED_COLUMNS = ["id", "enunciado", ...LETTERS.map((l) => `alternativa_${l}`)];

const norm = (s) => String(s ?? "").trim();
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Pontuação válida: número finito e maior que zero. */
export function validPoints(v) {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

export function parseQuestionsCSV(text) {
  const errors = [];
  if (norm(text) === "") return { questions: [], errors: ["O arquivo CSV está vazio."] };
  if (text.includes("\uFFFD")) {
    errors.push("O CSV contém caracteres inválidos. Salve o arquivo em UTF-8 e tente novamente.");
  }
  const delimiter = detectDelimiter(text);
  const { records, error } = parseCSV(text, delimiter);
  if (error) return { questions: [], errors: [...errors, error] };
  if (records.length === 0) return { questions: [], errors: [...errors, "O arquivo CSV está vazio."] };

  const header = records[0].fields.map((c) => norm(c).toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c.toLowerCase()));
  if (missing.length) {
    errors.push(`Colunas obrigatórias ausentes no CSV: ${missing.join(", ")}. Cabeçalho esperado: ${REQUIRED_COLUMNS.join(";")}.`);
    return { questions: [], errors };
  }
  const idx = Object.fromEntries(REQUIRED_COLUMNS.map((c) => [c, header.indexOf(c.toLowerCase())]));
  if (records.length === 1) errors.push("O CSV não contém nenhuma questão além do cabeçalho.");

  const seen = new Map();
  const questions = [];
  for (const rec of records.slice(1)) {
    const f = rec.fields;
    const where = `Linha ${rec.line}`;
    if (f.length !== header.length) {
      errors.push(`${where}: esperado ${header.length} colunas, encontrado ${f.length}. Verifique aspas e delimitadores.`);
      continue;
    }
    const id = norm(f[idx.id]);
    const text = norm(f[idx.enunciado]);
    if (!id) { errors.push(`${where}: o campo "id" está vazio.`); continue; }
    if (seen.has(id)) errors.push(`${where}: ID duplicado "${id}" (já usado na linha ${seen.get(id)}).`);
    else seen.set(id, rec.line);
    if (!text) errors.push(`${where} (${id}): o campo "enunciado" está vazio.`);
    const options = [];
    LETTERS.forEach((letter) => {
      const t = norm(f[idx[`alternativa_${letter}`]]);
      if (t) options.push({ letter, text: t });
    });
    if (options.length < 2) errors.push(`${where} (${id}): é preciso ter ao menos duas alternativas preenchidas.`);
    questions.push({ id, text, options, line: rec.line });
  }
  return { questions, errors };
}

export function parseAnswerKey(text) {
  if (norm(text) === "") return { key: null, errors: ["O arquivo JSON está vazio."] };
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch (e) { return { key: null, errors: [`JSON inválido: ${e.message}`] }; }
  const errors = [];
  if (!isPlainObject(data)) return { key: null, errors: ["O JSON do gabarito deve ser um objeto."] };
  if (data.schema_version !== SUPPORTED_SCHEMA) {
    errors.push(`"schema_version" deve ser "${SUPPORTED_SCHEMA}" (encontrado: ${JSON.stringify(data.schema_version)}).`);
  }
  for (const f of ["exam_id", "title"]) {
    if (typeof data[f] !== "string" || !data[f].trim()) errors.push(`O campo "${f}" é obrigatório e deve ser um texto.`);
  }
  for (const f of ["description", "subject"]) {
    if (data[f] !== undefined && typeof data[f] !== "string") errors.push(`O campo "${f}" deve ser um texto.`);
  }
  let defaultPoints = 1;
  if (data.default_points !== undefined) {
    if (!validPoints(data.default_points)) errors.push(`"default_points" deve ser um número maior que zero (encontrado: ${JSON.stringify(data.default_points)}).`);
    else defaultPoints = data.default_points;
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push('O campo "questions" deve ser uma lista com ao menos uma questão.');
    return { key: null, errors };
  }
  const entries = new Map();
  data.questions.forEach((q, i) => {
    const where = `Gabarito, item ${i + 1}`;
    if (!isPlainObject(q)) { errors.push(`${where}: deve ser um objeto.`); return; }
    const id = norm(q.id);
    if (!id) { errors.push(`${where}: o campo "id" é obrigatório.`); return; }
    if (entries.has(id)) { errors.push(`${where}: ID duplicado "${id}" no gabarito.`); return; }
    const letter = typeof q.correct_answer === "string" ? q.correct_answer.trim().toUpperCase() : "";
    if (!LETTERS.includes(letter)) errors.push(`${where} (${id}): "correct_answer" deve ser uma letra de A a E (encontrado: ${JSON.stringify(q.correct_answer)}).`);
    let points = defaultPoints;
    if (q.points !== undefined) {
      if (!validPoints(q.points)) errors.push(`${where} (${id}): "points" deve ser um número finito maior que zero (encontrado: ${JSON.stringify(q.points)}).`);
      else points = q.points;
    }
    if (q.explanation !== undefined && typeof q.explanation !== "string") errors.push(`${where} (${id}): "explanation" deve ser um texto.`);
    entries.set(id, { id, correct: letter, points, explanation: norm(q.explanation) });
  });
  if (errors.length) return { key: null, errors };
  return {
    key: {
      examId: data.exam_id.trim(), title: data.title.trim(),
      description: norm(data.description), subject: norm(data.subject), entries,
    },
    errors,
  };
}

/** Valida os dois arquivos e os cruza exclusivamente por ID. */
export function buildExam(csvText, jsonText) {
  const q = parseQuestionsCSV(csvText);
  const k = parseAnswerKey(jsonText);
  const errors = [...q.errors.map((e) => `CSV — ${e}`), ...k.errors.map((e) => `JSON — ${e}`)];
  if (!k.key || q.questions.length === 0) return { ok: false, errors, exam: null };

  const csvIds = new Set(q.questions.map((x) => x.id));
  const cross = [];
  for (const question of q.questions) {
    const entry = k.key.entries.get(question.id);
    if (!entry) { cross.push(`A questão "${question.id}" (linha ${question.line} do CSV) não tem gabarito no JSON.`); continue; }
    if (!question.options.some((o) => o.letter === entry.correct)) {
      cross.push(`Questão "${question.id}": o gabarito indica a alternativa ${entry.correct}, mas ela não existe ou está vazia no CSV.`);
    }
  }
  for (const id of k.key.entries.keys()) {
    if (!csvIds.has(id)) cross.push(`O gabarito contém o ID "${id}", que não existe no CSV.`);
  }
  errors.push(...cross.map((e) => `Divergência — ${e}`));
  if (errors.length) return { ok: false, errors, exam: null };

  const questions = q.questions.map((x) => {
    const e = k.key.entries.get(x.id);
    return { id: x.id, text: x.text, options: x.options, correct: e.correct, points: e.points, explanation: e.explanation };
  });
  const exam = {
    examId: k.key.examId, title: k.key.title, description: k.key.description, subject: k.key.subject,
    questions, maxPoints: questions.reduce((s, x) => s + x.points, 0),
  };
  return { ok: true, errors: [], exam };
}
