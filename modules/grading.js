// Correção independente. Uma única função de cálculo para nota e percentual.

/** Fonte única de verdade para nota (0–10) e percentual (0–100). Sem divisão por zero. */
export function computeScore(obtained, max) {
  if (!(max > 0)) return { obtained, max: 0, percent: 0, grade10: 0 };
  const ratio = obtained / max;
  return { obtained, max, percent: ratio * 100, grade10: ratio * 10 };
}

/** Corrige por ID. Resposta ausente = não respondida (zero, sem penalidade). */
export function gradeExam(exam, answers = {}) {
  let obtained = 0, correct = 0, wrong = 0, blank = 0;
  const items = exam.questions.map((q, i) => {
    const selected = answers[q.id] ?? null;
    let status;
    if (selected === null || selected === "") status = "blank";
    else if (selected === q.correct) status = "correct";
    else status = "wrong";
    const earned = status === "correct" ? q.points : 0;
    obtained += earned;
    if (status === "correct") correct++; else if (status === "wrong") wrong++; else blank++;
    return {
      number: i + 1, id: q.id, text: q.text, options: q.options,
      selected: status === "blank" ? null : selected, correct: q.correct,
      status, points: earned, maxPoints: q.points, explanation: q.explanation,
    };
  });
  const maxPoints = exam.questions.reduce((s, q) => s + q.points, 0);
  return { ...computeScore(obtained, maxPoints), totals: { questions: items.length, correct, wrong, blank }, items };
}
