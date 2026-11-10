import type { TextFormat } from "./types";

type DiffLine = { kind: "add" | "del" | "ctx" | "note"; text: string; old?: number; new?: number };
type Hunk = { header: string; lines: DiffLine[] };
type FileDiff = { from: string; to: string; status: "added" | "deleted" | "renamed" | "modified"; binary: boolean; hunks: Hunk[]; additions: number; deletions: number };

const MAX_LINES = 20_000;
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;
const GIT_HEADER = /^diff --git a\/(.+?) b\/(.+)$/;
const NULL_PATH = "/dev/null";

const stripPrefix = (path: string) => path.replace(/\t.*$/, "").replace(/^[ab]\//, "");

export function parseDiff(text: string): FileDiff[] {
  const files: FileDiff[] = [];
  const gitStyle = /^diff --git /m.test(text);
  let file: FileDiff | undefined;
  let hunk: Hunk | undefined;
  let oldLine = 0;
  let newLine = 0;
  let oldLeft = 0;
  let newLeft = 0;
  const start = (from: string, to: string) => {
    file = { from, to, status: "modified", binary: false, hunks: [], additions: 0, deletions: 0 };
    files.push(file);
    hunk = undefined;
  };
  for (const line of text.split("\n")) {
    if (hunk && file && (oldLeft > 0 || newLeft > 0)) {
      const sign = line[0];
      if (sign === "+") {
        hunk.lines.push({ kind: "add", text: line.slice(1), new: newLine++ });
        file.additions++;
        newLeft--;
        continue;
      }
      if (sign === "-") {
        hunk.lines.push({ kind: "del", text: line.slice(1), old: oldLine++ });
        file.deletions++;
        oldLeft--;
        continue;
      }
      if (sign === " " || line === "") {
        hunk.lines.push({ kind: "ctx", text: line.slice(1), old: oldLine++, new: newLine++ });
        oldLeft--;
        newLeft--;
        continue;
      }
    }
    if (line.startsWith("\\") && hunk) {
      hunk.lines.push({ kind: "note", text: line.slice(2) });
      continue;
    }
    const git = GIT_HEADER.exec(line);
    if (git) {
      start(git[1], git[2]);
      continue;
    }
    if (line.startsWith("--- ") && !gitStyle) start(stripPrefix(line.slice(4)), stripPrefix(line.slice(4)));
    if (!file) continue;
    if (line.startsWith("--- ")) {
      const from = stripPrefix(line.slice(4));
      if (from === NULL_PATH) file.status = "added";
      else file.from = from;
    } else if (line.startsWith("+++ ")) {
      const to = stripPrefix(line.slice(4));
      if (to === NULL_PATH) file.status = "deleted";
      else file.to = to;
    } else if (line.startsWith("new file mode")) file.status = "added";
    else if (line.startsWith("deleted file mode")) file.status = "deleted";
    else if (line.startsWith("rename from ")) file.from = line.slice(12);
    else if (line.startsWith("rename to ")) file.to = line.slice(10);
    else if (line.startsWith("Binary files ") || line === "GIT binary patch") file.binary = true;
    else {
      const header = HUNK_HEADER.exec(line);
      if (!header) continue;
      oldLine = Number(header[1]);
      newLine = Number(header[3]);
      oldLeft = header[2] === undefined ? 1 : Number(header[2]);
      newLeft = header[4] === undefined ? 1 : Number(header[4]);
      hunk = { header: header[5].trim(), lines: [] };
      file.hunks.push(hunk);
    }
  }
  for (const each of files) if (each.status === "modified" && each.from !== each.to) each.status = "renamed";
  return files.filter((each) => each.hunks.length > 0 || each.binary || each.status !== "modified");
}

const pathOf = (file: FileDiff) => (file.status === "deleted" ? file.from : file.to);
const STATUS_LABEL = { added: "Added", deleted: "Deleted", renamed: "Renamed", modified: "Modified" };

function FileSection({ file, index }: { file: FileDiff; index: number }) {
  return (
    <section className="diff-file" id={`file-${index + 1}`}>
      <header className="diff-file-header">
        <span className="diff-status" data-status={file.status}>{STATUS_LABEL[file.status]}</span>
        <span className="diff-path">{file.status === "renamed" ? <>{file.from} <span aria-hidden="true">→</span> {file.to}</> : pathOf(file)}</span>
        <span className="diff-counts"><span className="diff-plus">+{file.additions}</span> <span className="diff-minus">−{file.deletions}</span></span>
      </header>
      {file.binary ? (
        <p className="diff-note">Binary file, not shown.</p>
      ) : (
        <table className="diff-table">
          {file.hunks.map((hunk, hunkIndex) => (
            <tbody key={hunkIndex}>
              <tr className="diff-hunk">
                <td colSpan={3}>{hunk.header ? `… ${hunk.header}` : "…"}</td>
              </tr>
              {hunk.lines.map((line, lineIndex) => (
                <tr key={lineIndex} className={`diff-${line.kind}`}>
                  <td className="diff-num">{line.old ?? ""}</td>
                  <td className="diff-num">{line.new ?? ""}</td>
                  <td className="diff-code">{line.kind === "add" ? "+" : line.kind === "del" ? "−" : " "}{line.text}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}
    </section>
  );
}

export const diff: TextFormat = {
  id: "diff",
  test: (name) => /\.(diff|patch)$/i.test(name),
  render(text, { surface }) {
    const files = parseDiff(text);
    const lines = files.reduce((total, file) => total + file.hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0), 0);
    if (!files.length || lines > MAX_LINES) return null;
    const additions = files.reduce((total, file) => total + file.additions, 0);
    const deletions = files.reduce((total, file) => total + file.deletions, 0);
    return {
      mono: true,
      body: (
        <div className="diff" data-surface={surface}>
          <header className="diff-summary">
            <p>
              {files.length} {files.length === 1 ? "file" : "files"} changed <span className="diff-plus">+{additions}</span> <span className="diff-minus">−{deletions}</span>
            </p>
            {files.length > 1 && (
              <ol className="diff-index">
                {files.map((file, index) => (
                  <li key={index}>
                    <a href={`#file-${index + 1}`}>{pathOf(file)}</a>
                    <span className="diff-counts"><span className="diff-plus">+{file.additions}</span> <span className="diff-minus">−{file.deletions}</span></span>
                  </li>
                ))}
              </ol>
            )}
          </header>
          {files.map((file, index) => <FileSection key={index} file={file} index={index} />)}
        </div>
      ),
    };
  },
};
