export function csvEscape(value: string): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r") || str.includes("\t")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCSV(headers: string[], rows: Record<string, string>[]): string {
  const bom = "\uFEFF";
  const headerLine = headers.map(csvEscape).join(",");
  const dataLines = rows.map((row) => headers.map((h) => csvEscape(row[h] ?? "")).join(","));
  return bom + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r\n|\n/)[0] || "";
  let inQuotes = false;
  let commaCount = 0;
  let tabCount = 0;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === ",") commaCount++;
    else if (!inQuotes && ch === "\t") tabCount++;
  }
  return tabCount > commaCount ? "\t" : ",";
}

export function parseCSV(text: string): Record<string, string>[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { currentField += '"'; i++; }
        else inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter) { currentRow.push(currentField); currentField = ""; }
      else if (ch === "\r") {
        if (text[i + 1] === "\n") i++;
        currentRow.push(currentField); rows.push(currentRow); currentRow = []; currentField = "";
      } else if (ch === "\n") {
        currentRow.push(currentField); rows.push(currentRow); currentRow = []; currentField = "";
      } else {
        currentField += ch;
      }
    }
  }
  if (currentField || currentRow.length) { currentRow.push(currentField); rows.push(currentRow); }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
      return obj;
    });
}

export function download(filename: string, content: string, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sanitizeCSVValue(value: string): string {
  if (value == null) return "";
  const str = String(value);
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
    return `'${str}`;
  }
  return str;
}
