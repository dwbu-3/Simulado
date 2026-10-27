// Execute com: node --test  (Node 18+; na raiz do projeto)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCSV, detectDelimiter } from "../modules/csv-parser.js";
import { buildExam, parseQuestionsCSV, parseAnswerKey } from "../modules/exam-validator.js";
import { gradeExam, computeScore } from "../modules/grading.js";
import { createAttempt, setAnswer, finalize, progress, toggleFlag, goTo } from "../modules/exam-engine.js";
import { createStorage } from "../modules/storage.js";
import { buildExport, exportJSON, filterItems } from "../modules/results.js";

const csv = readFileSync(new URL("../examples/simulado-exemplo.csv", import.meta.url), "utf8");
const json = readFileSync(new URL("../examples/gabarito-exemplo.json", import.meta.url), "utf8");
const mockStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };

test("CSV: aspas, acentos, delimitador, aspas escapadas e quebra de linha", () => {
  const { records, error } = parseCSV('id;t\nQ1;"a; b ""c"" é\nlinha2"\nQ2;"x"\n');
  assert.equal(error, null);
  assert.equal(records.length, 3);
  assert.equal(records[1].fields[1], 'a; b "c" é\nlinha2');
  assert.equal(records[2].line, 4);
});
test("CSV: BOM, CRLF e detecção de vírgula", () => {
  const text = "\uFEFFid,t\r\nQ1,\"a, b\"\r\n";
  assert.equal(detectDelimiter(text), ",");
  const { records } = parseCSV(text, ",");
  assert.deepEqual(records[0].fields, ["id", "t"]);
  assert.equal(records[1].fields[1], "a, b");
  assert.equal(detectDelimiter("id;a,b"), ";");
});
test("CSV: aspas não fechadas geram erro com a linha", () => {
  assert.match(parseCSV('id;t\nQ1;"aberta').error, /linha 2/);
});
test("Importação do exemplo válido", () => {
  const r = buildExam(csv, json);
  assert.equal(r.ok, true, r.errors.join("\n"));
  assert.equal(r.exam.questions.length, 6);
  assert.equal(r.exam.maxPoints, 8.5);
  assert.equal(r.exam.questions[3].options.length, 4); // alternativa E vazia
  assert.equal(r.exam.questions[4].correct, "C"); // "c" normalizado
});
test("CSV: erros de validação", () => {
  assert.match(parseQuestionsCSV("").errors[0], /vazio/);
  assert.match(parseQuestionsCSV("id;enunciado\nQ1;x").errors[0], /Colunas obrigatórias/);
  const h = "id;enunciado;alternativa_A;alternativa_B;alternativa_C;alternativa_D;alternativa_E\n";
  assert.ok(parseQuestionsCSV(h + 'Q1;"a";"1";"2";"";"";""\nQ1;"b";"1";"2";"";"";""').errors.some((e) => /duplicado/.test(e)));
  assert.ok(parseQuestionsCSV(h + 'Q1;"a";"1";"";"";"";""').errors.some((e) => /duas alternativas/.test(e)));
  assert.ok(parseQuestionsCSV(h + 'Q1;"a";"1";"2"').errors.some((e) => /colunas/.test(e)));
});
test("Gabarito: validação", () => {
  assert.match(parseAnswerKey("{ruim").errors[0], /JSON inválido/);
  const base = (q, extra = {}) => JSON.stringify({ schema_version: "1.0", exam_id: "x", title: "T", questions: [q], ...extra });
  assert.ok(parseAnswerKey(base({ id: "A", correct_answer: "Z" })).errors.length);
  assert.ok(parseAnswerKey(base({ id: "A", correct_answer: "A", points: -1 })).errors.length);
  assert.ok(parseAnswerKey(base({ id: "A", correct_answer: "A", points: "2" })).errors.length);
  assert.ok(parseAnswerKey(base({ id: "A", correct_answer: "A" }, { default_points: 0 })).errors.length);
  assert.ok(parseAnswerKey(base({ id: "A", correct_answer: "A" }, { schema_version: "9" })).errors.length);
  assert.equal(parseAnswerKey(base({ id: "A", correct_answer: "a" })).key.entries.get("A").points, 1);
});
test("Divergência CSV x JSON é bloqueada e associação é por ID", () => {
  const obj = JSON.parse(json);
  obj.questions.pop(); obj.questions.push({ id: "Q999", correct_answer: "A" });
  const r = buildExam(csv, JSON.stringify(obj));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /Q006.*não tem gabarito/.test(e)));
  assert.ok(r.errors.some((e) => /Q999/.test(e)));
  // ordem diferente no JSON não altera a correção
  const rev = JSON.parse(json); rev.questions.reverse();
  const ok = buildExam(csv, JSON.stringify(rev));
  assert.equal(ok.ok, true);
  assert.equal(ok.exam.questions[1].correct, "B");
  // resposta apontando para alternativa vazia
  const bad = JSON.parse(json); bad.questions[3].correct_answer = "E";
  assert.ok(buildExam(csv, JSON.stringify(bad)).errors.some((e) => /alternativa E/.test(e)));
});
test("Correção: certas, erradas, em branco e pesos diferentes", () => {
  const { exam } = buildExam(csv, json);
  const r = gradeExam(exam, { Q001: "B", Q002: "A", Q005: "C", Q006: "B" });
  assert.deepEqual(r.totals, { questions: 6, correct: 3, wrong: 1, blank: 2 });
  assert.equal(r.obtained, 1 + 2 + 1.5);
  assert.equal(r.max, 8.5);
  assert.ok(Math.abs(r.percent - (4.5 / 8.5) * 100) < 1e-12);
  assert.ok(Math.abs(r.grade10 - (4.5 / 8.5) * 10) < 1e-12);
  assert.equal(r.items[2].status, "blank");
  assert.equal(r.items[1].points, 0);
});
test("Nota: sem divisão por zero e precisão preservada", () => {
  assert.deepEqual(computeScore(0, 0), { obtained: 0, max: 0, percent: 0, grade10: 0 });
  assert.equal(computeScore(1, 3).grade10, (1 / 3) * 10);
});
test("Fluxo completo: importar, responder, finalizar, corrigir, exportar, filtrar", () => {
  const { exam } = buildExam(csv, json);
  const a = createAttempt(exam);
  setAnswer(a, "Q001", "B"); setAnswer(a, "Q002", "Z"); // Z inválida, ignorada
  toggleFlag(a, "Q003"); goTo(a, 99);
  assert.equal(a.currentIndex, 5);
  assert.deepEqual(progress(a), { total: 6, answered: 1, unanswered: 5, flagged: 1 });
  finalize(a);
  setAnswer(a, "Q002", "B"); // não altera após finalizar
  assert.equal(a.answers.Q002, undefined);
  const exp = JSON.parse(exportJSON(a));
  assert.equal(exp.score.grade_10, a.result.grade10);
  assert.equal(exp.questions.length, 6);
  assert.equal(buildExport(a).totals.correct, 1);
  assert.equal(filterItems(a.result.items, "blank").length, 5);
  assert.equal(filterItems(a.result.items, "correct").length, 1);
});
test("Armazenamento: salvar, recuperar, apagar", () => {
  const { exam } = buildExam(csv, json);
  const be = mockStorage(); const s = createStorage(be);
  const a = createAttempt(exam); setAnswer(a, "Q001", "B");
  assert.equal(s.save(a), true);
  assert.equal(s.inProgress()[0].answers.Q001, "B");
  finalize(a); s.save(a);
  assert.equal(s.list().length, 1); assert.equal(s.finished().length, 1);
  s.remove(a.attemptId); assert.equal(s.list().length, 0);
  s.save(a); s.clear(); assert.equal(be.getItem("simulados:v1:tentativas"), null);
});
test("Armazenamento: dados corrompidos e falhas", () => {
  const be = mockStorage(); be.setItem("simulados:v1:tentativas", "{quebrado");
  const s = createStorage(be);
  assert.deepEqual(s.list(), []); assert.equal(s.wasCorrupted(), true);
  be.setItem("simulados:v1:tentativas", JSON.stringify([{ attemptId: 1 }, "x"]));
  assert.equal(s.list().length, 0);
  const off = createStorage({ getItem() { throw new Error("x"); }, setItem() { throw new Error("bloqueado"); }, removeItem() {} });
  assert.equal(off.isAvailable(), false);
  const { exam } = buildExam(csv, json); const a = createAttempt(exam);
  assert.equal(off.save(a), false);
  assert.equal(off.list().length, 1); // continua na sessão atual
  assert.equal(createStorage(null).isAvailable(), false);
});
test("Gabarito não é salvo em chave separada", () => {
  const be = mockStorage(); const s = createStorage(be);
  const { exam } = buildExam(csv, json); s.save(createAttempt(exam));
  assert.deepEqual([...be._m.keys()], ["simulados:v1:tentativas"]);
});
