import { asNumber, asText as str, entries, isEntry, parseJson, type Entry } from "./json-value";
import type { TextFormat } from "./types";

type Status = "passed" | "failed" | "skipped" | "flaky";
type TestCase = { name: string; status: Status; durationMs?: number; message?: string; details?: string };
type Suite = { name: string; cases: TestCase[] };
type Report = { tool: string; suites: Suite[]; durationMs?: number };
type Element = { name: string; attrs: Map<string, string>; children: Element[]; text: string };

const MAX_CASES = 5_000;
const ANSI = /\u001b\[[0-9;]*m/g;
const TOKEN = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
const ATTRIBUTE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const ENTITY = /&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi;
const NAMED = new Map([["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"]]);

const decode = (text: string) =>
  text.replace(ENTITY, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number(lower.slice(1)));
    return NAMED.get(lower) ?? match;
  });

function parseXml(text: string): Element | undefined {
  const root: Element = { name: "#root", attrs: new Map(), children: [], text: "" };
  const stack = [root];
  for (const match of text.matchAll(TOKEN)) {
    const [, cdata, closing, name, attributes, selfClosing, content] = match;
    const parent = stack[stack.length - 1];
    if (cdata !== undefined) parent.text += cdata;
    else if (content !== undefined) parent.text += decode(content);
    else if (name === undefined) continue;
    else if (closing) {
      if (stack.length > 1 && parent.name === name) stack.pop();
    } else {
      const attrs = new Map(Array.from(attributes.matchAll(ATTRIBUTE), ([, key, double, single]) => [key, decode(double ?? single ?? "")] as const));
      const element: Element = { name, attrs, children: [], text: "" };
      parent.children.push(element);
      if (!selfClosing) stack.push(element);
    }
  }
  return root.children.find((child) => child.name === "testsuites" || child.name === "testsuite");
}

const seconds = (value: string | undefined) => (value && Number.isFinite(Number(value)) ? Math.round(Number(value) * 1000) : undefined);

function fromJUnit(root: Element): Report {
  const suites: Suite[] = [];
  const collect = (element: Element) => {
    if (element.name === "testsuite") {
      const cases = element.children.filter((child) => child.name === "testcase").map((testcase): TestCase => {
        const failure = testcase.children.find((child) => child.name === "failure" || child.name === "error");
        const skipped = testcase.children.some((child) => child.name === "skipped");
        return {
          name: testcase.attrs.get("name") ?? "Unnamed test",
          status: failure ? "failed" : skipped ? "skipped" : "passed",
          durationMs: seconds(testcase.attrs.get("time")),
          message: failure?.attrs.get("message")?.trim() || undefined,
          details: failure?.text.trim() || undefined,
        };
      });
      if (cases.length) suites.push({ name: element.attrs.get("name") ?? "Tests", cases });
    }
    element.children.filter((child) => child.name === "testsuite").forEach(collect);
  };
  collect(root);
  return { tool: "JUnit", suites, durationMs: seconds(root.attrs.get("time")) };
}


const PLAYWRIGHT_STATUS = new Map<string, Status>([["expected", "passed"], ["unexpected", "failed"], ["flaky", "flaky"], ["skipped", "skipped"]]);

function fromPlaywright(report: Entry): Report | null {
  if (!isEntry(report.config) || !Array.isArray(report.suites)) return null;
  const suites: Suite[] = [];
  const walk = (suite: Entry, trail: string[]) => {
    const title = str(suite.title);
    const path = title ? [...trail, title] : trail;
    const cases: TestCase[] = [];
    for (const spec of entries(suite.specs)) {
      for (const test of entries(spec.tests)) {
        const results = entries(test.results);
        const failed = results.find((result) => isEntry(result.error));
        const error = failed && isEntry(failed.error) ? failed.error : undefined;
        const project = str(test.projectName);
        cases.push({
          name: project ? `${str(spec.title)} [${project}]` : str(spec.title),
          status: PLAYWRIGHT_STATUS.get(str(test.status)) ?? "failed",
          durationMs: results.reduce((total, result) => total + asNumber(result.duration), 0),
          message: error ? str(error.message).replace(ANSI, "").split("\n")[0] : undefined,
          details: error ? str(error.stack || error.message).replace(ANSI, "") : undefined,
        });
      }
    }
    if (cases.length) suites.push({ name: path.join(" › ") || "Tests", cases });
    for (const child of entries(suite.suites)) walk(child, path);
  };
  for (const suite of entries(report.suites)) walk(suite, []);
  const stats = isEntry(report.stats) ? report.stats : {};
  return { tool: "Playwright", suites, durationMs: isEntry(report.stats) && asNumber(stats.duration, -1) >= 0 ? Math.round(asNumber(stats.duration)) : undefined };
}

const formatDuration = (ms: number | undefined) => (ms === undefined ? "" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`);
const STATUS_LABEL: Record<Status, string> = { passed: "Passed", failed: "Failed", skipped: "Skipped", flaky: "Flaky" };

function CaseRow({ test }: { test: TestCase }) {
  return (
    <li className="tests-case" data-status={test.status}>
      <span className="tests-dot" aria-label={STATUS_LABEL[test.status]} />
      <span className="tests-name">{test.name}</span>
      <span className="tests-time">{formatDuration(test.durationMs)}</span>
    </li>
  );
}

function ReportView({ report, surface }: { report: Report; surface: "page" | "drawer" }) {
  const all = report.suites.flatMap((suite) => suite.cases.map((test) => ({ suite: suite.name, test })));
  const count = (status: Status) => all.filter(({ test }) => test.status === status).length;
  const failures = all.filter(({ test }) => test.status === "failed" || test.status === "flaky");
  return (
    <article className="prose tests" data-surface={surface}>
      <header className="tests-header">
        <p className="tests-tool">{report.tool} report</p>
        <h1>{failures.some(({ test }) => test.status === "failed") ? `${count("failed")} of ${all.length} tests failed` : `All ${all.length - count("skipped")} tests passed`}</h1>
        <p className="tests-counts">
          <span data-status="passed">{count("passed")} passed</span>
          {count("failed") > 0 && <span data-status="failed">{count("failed")} failed</span>}
          {count("flaky") > 0 && <span data-status="flaky">{count("flaky")} flaky</span>}
          {count("skipped") > 0 && <span data-status="skipped">{count("skipped")} skipped</span>}
          {report.durationMs !== undefined && <span>{formatDuration(report.durationMs)}</span>}
        </p>
      </header>
      {failures.length > 0 && (
        <section aria-label="Failures" className="tests-failures">
          {failures.map(({ suite, test }, index) => (
            <div key={index} className="tests-failure" data-status={test.status}>
              <p className="tests-failure-name"><span className="tests-suite">{suite} ›</span> {test.name}</p>
              {test.message && <p className="tests-message">{test.message}</p>}
              {test.details && test.details !== test.message && <pre className="tests-details">{test.details}</pre>}
            </div>
          ))}
        </section>
      )}
      {report.suites.map((suite, index) => (
        <details key={index} className="tests-suite-group" open={suite.cases.some((test) => test.status === "failed")}>
          <summary>
            <span>{suite.name}</span>
            <span className="tests-time">{suite.cases.filter((test) => test.status === "passed").length}/{suite.cases.length}</span>
          </summary>
          <ul>{suite.cases.map((test, caseIndex) => <CaseRow key={caseIndex} test={test} />)}</ul>
        </details>
      ))}
    </article>
  );
}

const usable = (report: Report | null | undefined) => report && report.suites.length > 0 && report.suites.reduce((total, suite) => total + suite.cases.length, 0) <= MAX_CASES;

export const junit: TextFormat = {
  id: "junit",
  test: (name) => /\.xml$/i.test(name),
  render(text, { surface }) {
    if (!/<testsuites?[\s>]/.test(text)) return null;
    const root = parseXml(text);
    const report = root && fromJUnit(root);
    return report && usable(report) ? { body: <ReportView report={report} surface={surface} /> } : null;
  },
};

export const playwright: TextFormat = {
  id: "playwright",
  test: (name) => /\.json$/i.test(name),
  render(text, { surface }) {
    if (!text.includes('"suites"') || !text.includes('"config"')) return null;
    const value = parseJson(text);
    const report = isEntry(value) ? fromPlaywright(value) : null;
    return report && usable(report) ? { body: <ReportView report={report} surface={surface} /> } : null;
  },
};
