// Parser CSV próprio (máquina de estados). Não usa split(",").
// Suporta aspas, aspas escapadas (""), delimitadores e quebras de linha dentro de campos, BOM.

export function stripBOM(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Detecta o delimitador pela linha de cabeçalho (fora de aspas). Padrão: ";". */
export function detectDelimiter(text) {
  const header = stripBOM(text).split(/\r\n|\n|\r/)[0] || "";
  const count = (d) => {
    let n = 0, q = false;
    for (const ch of header) {
      if (ch === '"') q = !q;
      else if (!q && ch === d) n++;
    }
    return n;
  };
  const semi = count(";"), comma = count(",");
  return comma > 0 && semi === 0 ? "," : ";";
}

/**
 * Retorna { records: [{ line, fields }], error }.
 * `line` é a linha física (1-based) em que o registro começa.
 */
export function parseCSV(text, delimiter = ";") {
  text = stripBOM(String(text));
  const records = [];
  let fields = [], field = "", inQuotes = false, justClosed = false;
  let line = 1, recordLine = 1, quoteLine = 1, sawAny = false;

  const endField = () => { fields.push(field); field = ""; justClosed = false; };
  const endRecord = () => {
    endField();
    if (!(fields.length === 1 && fields[0].trim() === "")) records.push({ line: recordLine, fields });
    fields = []; sawAny = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; justClosed = true; }
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      if (field.length === 0 && !justClosed) { inQuotes = true; quoteLine = line; sawAny = true; }
      else field += ch;
    } else if (ch === delimiter) { sawAny = true; endField(); }
    else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRecord(); line++; recordLine = line;
    } else {
      if (justClosed && ch.trim() === "") continue;
      field += ch; sawAny = true;
    }
  }
  if (inQuotes) {
    return { records, error: `Aspas abertas na linha ${quoteLine} nunca foram fechadas.` };
  }
  if (sawAny || field.length > 0 || fields.length > 0) endRecord();
  return { records, error: null };
}
