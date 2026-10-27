// Estado da tentativa: respostas, marcações, navegação e finalização.
import { gradeExam } from "./grading.js";

const newId = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createAttempt(exam, now = new Date()) {
  return {
    attemptId: newId(), examId: exam.examId, title: exam.title, subject: exam.subject,
    totalQuestions: exam.questions.length, maxPoints: exam.maxPoints,
    startedAt: now.toISOString(), finishedAt: null, status: "in_progress",
    currentIndex: 0, answers: {}, flags: {}, result: null,
    // Necessário para retomar a prova; fica dentro do registro da tentativa (não é uma chave separada).
    exam,
  };
}

export function setAnswer(attempt, questionId, letter) {
  if (attempt.status !== "in_progress") return attempt;
  const q = attempt.exam.questions.find((x) => x.id === questionId);
  if (!q || !q.options.some((o) => o.letter === letter)) return attempt;
  attempt.answers[questionId] = letter;
  return attempt;
}
export function toggleFlag(attempt, questionId) {
  if (attempt.flags[questionId]) delete attempt.flags[questionId]; else attempt.flags[questionId] = true;
  return attempt;
}
export function goTo(attempt, index) {
  attempt.currentIndex = Math.max(0, Math.min(attempt.exam.questions.length - 1, index));
  return attempt;
}
export function progress(attempt) {
  const total = attempt.exam.questions.length;
  const answered = attempt.exam.questions.filter((q) => attempt.answers[q.id]).length;
  const flagged = attempt.exam.questions.filter((q) => attempt.flags[q.id]).length;
  return { total, answered, unanswered: total - answered, flagged };
}
export function finalize(attempt, now = new Date()) {
  attempt.result = gradeExam(attempt.exam, attempt.answers);
  attempt.finishedAt = now.toISOString();
  attempt.status = "finished";
  return attempt;
}
/** Nova tentativa do mesmo simulado. */
export function retake(attempt) { return createAttempt(attempt.exam); }
