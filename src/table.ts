export type Table = { header: string[]; rows: string[][]; totalRows: number };

const MAX_ROWS = 500;
const MAX_COLUMNS = 50;

export function parseDelimited(text: string, delimiter: "," | "\t"): Table {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"' && field === "") quoted = true;
    else if (char === delimiter) {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || record.length) {
    record.push(field);
    records.push(record);
  }
  const [header = [], ...rows] = records.map((row) => row.slice(0, MAX_COLUMNS));
  return { header, rows: rows.slice(0, MAX_ROWS), totalRows: rows.length };
}
