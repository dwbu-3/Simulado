// Filtros e exportação do relatório.
export const FILTERS = { all: "Todas", wrong: "Erradas", correct: "Corretas", blank: "Não respondidas" };

export function filterItems(items, filter) {
  return filter === "all" || !FILTERS[filter] ? items : items.filter((i) => i.status === filter);
}

export function buildExport(attempt) {
  const r = attempt.result;
  return {
    export_version: "1.0",
    exam_id: attempt.examId, title: attempt.title,
    started_at: attempt.startedAt, finished_at: attempt.finishedAt,
    score: { obtained: r.obtained, max: r.max, percent: r.percent, grade_10: r.grade10 },
    totals: { questions: r.totals.questions, correct: r.totals.correct, wrong: r.totals.wrong, blank: r.totals.blank },
    questions: r.items.map((i) => ({
      number: i.number, id: i.id, statement: i.text,
      selected_answer: i.selected, correct_answer: i.correct, status: i.status,
      points: i.points, max_points: i.maxPoints, explanation: i.explanation || null,
    })),
  };
}
export const exportJSON = (attempt) => JSON.stringify(buildExport(attempt), null, 2);
export const exportFileName = (attempt) => `resultado-${attempt.examId.replace(/[^\w-]+/g, "_")}.json`;
