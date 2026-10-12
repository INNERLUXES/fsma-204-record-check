// A run: read the file as a table, look for keys and seeds in it, run the checks and build the report object that the
// formats write.

import { analyze } from './analyze.js';
import { CSV_LIMITS, CsvError, cellAt, readTable } from './csv.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { FILE_LIMITS, InputError, displayPath, locateInput, readInputText } from './files.js';
import { normalizeName } from './fields.js';
import { RULES, decide, ruleById } from './rules.js';
import { findSecrets } from './secrets.js';
import { safeText } from './text.js';

export const LIMITS = { ...FILE_LIMITS, ...CSV_LIMITS };

export { InputError };

const clean = (t, max = 900) => safeText(t, max);

const ORDER = { error: 0, warning: 1, info: 2 };

// The columns that hold identifiers. A cell of 64 hex digits in one of them is a hash used as an identifier, and is read as
// one and not as a private key in hex (docs/limits.md).
export const HEX_COLUMNS = ['traceability_lot_code', 'input_traceability_lot_code', 'reference_document_number'];

// The basis of a rule: the points with their sections.
function basisOf(rule) {
  return rule.basis.map((id) => {
    const page = pointPage(id);
    return { text: POINTS[id].text, section: POINTS[id].section, source: page.title, url: page.url };
  });
}

// The findings of the text of a records file, with no file system. Returns { table, analysis, findings, notes }.
export function checkText(text, { now = null, limits = CSV_LIMITS } = {}) {
  let table;
  try {
    table = readTable(text, { limits });
  } catch (error) {
    if (!(error instanceof CsvError)) throw error;
    const findings = [{ id: 'file-unreadable', line: error.line, column: error.column, message: `The file is not a table the reader can follow: ${error.message}. Nothing in the file was checked.`, subject: null }];
    return { table: null, analysis: { findings: [], notes: [], summary: null, omitted: new Map() }, findings, notes: ['the file was not checked, because it is not a table the reader can follow'] };
  }
  if (table.rows.length === 0) {
    const findings = [{ id: 'file-unreadable', line: 1, column: 1, message: 'The file holds a header and no rows, so there is no record to check. Nothing in the file was checked.', subject: null }];
    return { table, analysis: { findings: [], notes: [], summary: null, omitted: new Map() }, findings, notes: ['the file was not checked, because it holds no rows'] };
  }
  const hexColumns = new Set(table.header.cells.map((c, i) => (HEX_COLUMNS.includes(normalizeName(c)) ? i : -1)).filter((i) => i >= 0));
  const secrets = findSecrets(table, cellAt, hexColumns);
  const analysis = analyze(table, { now });
  return { table, analysis, findings: [...secrets, ...analysis.findings], notes: [...table.notes, ...analysis.notes] };
}

const lineCount = (text) => {
  const parts = text === '' ? [] : text.split(/\r\n|\r|\n/);
  return parts.length > 0 && parts.at(-1) === '' ? parts.length - 1 : parts.length;
};

// The report object for the findings of the file. file is { file, bytes, lines }.
export function buildReport({ file, checked, version, minSeverity = 'info', failOn = 'error', now = null }) {
  const all = checked.findings.map((f) => {
    const rule = ruleById(f.id);
    return {
      id: f.id,
      severity: rule.severity,
      message: clean(f.message),
      file: file.file,
      line: f.line,
      column: f.column,
      at: `${file.file}:${f.line}`,
      subject: f.subject == null ? null : clean(f.subject, 120),
      fix: rule.fix,
      kind: rule.kind,
      basis: basisOf(rule),
      own: rule.own ?? null
    };
  });
  all.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.line - b.line || a.column - b.column || a.id.localeCompare(b.id, 'en'));
  const omitted = checked.analysis.omitted;
  const shown = all.filter((f) => LEVELS.indexOf(f.severity) >= LEVELS.indexOf(minSeverity));
  const extra = (rule) => omitted.get(rule.id) ?? 0;
  const byLevel = { error: 0, warning: 0, info: 0 };
  const allByLevel = { error: 0, warning: 0, info: 0 };
  for (const f of all) allByLevel[f.severity] += 1;
  for (const f of shown) byLevel[f.severity] += 1;
  for (const rule of RULES) {
    allByLevel[rule.severity] += extra(rule);
    if (LEVELS.indexOf(rule.severity) >= LEVELS.indexOf(minSeverity)) byLevel[rule.severity] += extra(rule);
  }
  const total = (o) => o.error + o.warning + o.info;
  const summary = checked.analysis.summary;
  return {
    tool: 'fsma-204-record-check',
    version,
    input: { file: file.file, format: file.format, bytes: file.bytes, lines: file.lines },
    records: summary,
    totals: { findings: total(byLevel), byLevel, hidden: total(allByLevel) - total(byLevel) },
    rules: RULES.map((r) => ({ id: r.id, level: r.severity, kind: r.kind, findings: shown.filter((f) => f.id === r.id).length + (LEVELS.indexOf(r.severity) >= LEVELS.indexOf(minSeverity) ? extra(r) : 0) })),
    options: { minSeverity, failOn, now },
    findings: shown,
    eventTypes: summary ? summary.types : null,
    notes: checked.notes.map((n) => clean(n)),
    notice: NOTICE,
    result: decide(allByLevel, failOn)
  };
}

// Reads the records file and builds the report.
export async function checkFile({ path, minSeverity = 'info', failOn = 'error', now = null, version, limits = LIMITS, base = process.cwd() }) {
  const absolute = await locateInput(path, base);
  const { text, bytes } = await readInputText(absolute, base, limits);
  const checked = checkText(text, { now, limits });
  const format = checked.table ? (checked.table.delimiter === '\t' ? 'TSV' : 'CSV') : 'CSV';
  return buildReport({ file: { file: displayPath(absolute, base), format, bytes, lines: lineCount(text) }, checked, version, minSeverity, failOn, now });
}
