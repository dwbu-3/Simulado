// Persistência em localStorage com tratamento de falhas e dados inválidos.
// Se o armazenamento estiver indisponível, mantém tudo em memória na sessão atual.
const KEY = "simulados:v1:tentativas";

function validAttempt(a) {
  return a && typeof a === "object" && typeof a.attemptId === "string" && typeof a.examId === "string"
    && (a.status === "in_progress" || a.status === "finished")
    && a.answers && typeof a.answers === "object" && a.flags && typeof a.flags === "object"
    && a.exam && Array.isArray(a.exam.questions) && a.exam.questions.length > 0
    && a.exam.questions.every((q) => q && typeof q.id === "string" && Array.isArray(q.options) && typeof q.correct === "string")
    && Number.isInteger(a.currentIndex);
}

export function createStorage(backend) {
  let memory = [];
  let available = false;
  try {
    if (backend) {
      backend.setItem("simulados:teste", "1");
      backend.removeItem("simulados:teste");
      available = true;
    }
  } catch { available = false; }
  let corrupted = false;

  function load() {
    if (!available) return memory.slice();
    let raw;
    try { raw = backend.getItem(KEY); } catch { return memory.slice(); }
    if (raw === null || raw === undefined) return [];
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error("formato");
      const valid = data.filter(validAttempt);
      if (valid.length !== data.length) corrupted = true;
      return valid;
    } catch {
      corrupted = true;
      return [];
    }
  }
  function persist(list) {
    memory = list.slice();
    if (!available) return false;
    try { backend.setItem(KEY, JSON.stringify(list)); return true; }
    catch { available = false; return false; }
  }
  return {
    isAvailable: () => available,
    wasCorrupted: () => corrupted,
    acknowledgeCorruption() { corrupted = false; },
    list: load,
    save(attempt) {
      const list = load().filter((a) => a.attemptId !== attempt.attemptId);
      list.unshift(JSON.parse(JSON.stringify(attempt)));
      return persist(list.slice(0, 30));
    },
    remove(attemptId) { return persist(load().filter((a) => a.attemptId !== attemptId)); },
    clear() {
      memory = [];
      if (!available) return true;
      try { backend.removeItem(KEY); return true; } catch { return false; }
    },
    inProgress() { return load().filter((a) => a.status === "in_progress"); },
    finished() { return load().filter((a) => a.status === "finished"); },
  };
}

export function browserStorage() {
  try { return createStorage(window.localStorage); } catch { return createStorage(null); }
}
