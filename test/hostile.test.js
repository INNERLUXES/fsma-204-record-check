import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { COLUMN_NAMES, CSV_LIMITS, FINDING_CAP, checkText } from '../src/index.js';
import { ARGS, GOOD, allowed, cli, clean, lineOfRow, receiving, run, shipping, table, withFiles } from './helpers.js';

// Each test builds input meant to make the tool slow or to exhaust the stack or the memory, and checks that it ends with
// an answer in good time. The time allowed is four times as long under coverage (NODE_V8_COVERAGE is set only when
// coverage is on).

function timed(fn) {
  const start = process.hrtime.bigint();
  const value = fn();
  return { value, ms: Number(process.hrtime.bigint() - start) / 1e6 };
}

// A small header and a short row, for the tests that need many rows.
const SMALL = ['event_type', 'traceability_lot_code', 'quantity', 'unit_of_measure', 'event_date'];

test('a hundred thousand rows of one lot, shipped and received: the checks across rows stay linear and the sums are exact', () => {
  const rows = [];
  for (let i = 0; i < 50000; i += 1) {
    rows.push(`shipping,LOT-1,1,cases,2101-03-01`);
    rows.push(`receiving,LOT-1,1,cases,2101-03-02`);
  }
  const text = `${SMALL.join(',')}\n${rows.join('\n')}\n`;
  const { value, ms } = timed(() => checkText(text, { now: '2101-03-10T12:00:00Z' }));
  assert.equal(value.analysis.summary.rows, 100000);
  assert.equal(value.findings.filter((f) => f.id === 'received-more-than-shipped').length, 0, 'exactly as much was received as shipped');
  assert.ok(ms < allowed(30000), `took ${ms} ms`);
});

test('a hundred thousand rows with the same mistake: the first of each check are listed, the rest counted, in good time', () => {
  const rows = Array.from({ length: 100000 }, (_, i) => lineOfRow({ event_type: 'shipping', traceability_lot_code: `LOT-${i}`, quantity: '1', unit_of_measure: 'cases', event_date: '2101-02-30' }, SMALL));
  const { value, ms } = timed(() => checkText(`${SMALL.join(',')}\n${rows.join('\n')}\n`));
  assert.equal(value.findings.filter((f) => f.id === 'date-invalid').length, FINDING_CAP);
  assert.equal(value.analysis.omitted.get('date-invalid'), 100000 - FINDING_CAP);
  assert.ok(ms < allowed(30000), `took ${ms} ms`);
});

test('more rows than the limit: the first of the limit are read, with a note', () => {
  const rows = Array.from({ length: 1005 }, (_, i) => `receiving,LOT-${i},1,cases,2101-03-01`);
  const { value } = timed(() => checkText(`${SMALL.join(',')}\n${rows.join('\n')}\n`, { limits: { ...CSV_LIMITS, maxRows: 1000 } }));
  assert.equal(value.analysis.summary.rows, 1000);
  assert.ok(value.notes.includes('the file holds more than 1000 rows; the tool read the first 1000 and left the rest out'));
});

test('a cell of a million characters, in quotes and out of them, ends with a file-unreadable finding at its place and not a hang', () => {
  for (const cell of ['x'.repeat(1000000), `"${'x'.repeat(1000000)}"`, `"${'""'.repeat(500000)}"`]) {
    const { value, ms } = timed(() => checkText(`${SMALL.join(',')}\nshipping,${cell},1,cases,2101-03-01\n`));
    assert.equal(value.findings[0].id, 'file-unreadable');
    assert.match(value.findings[0].message, new RegExp(`longer than ${CSV_LIMITS.maxCellLength} characters`));
    assert.equal(value.findings[0].line, 2);
    assert.ok(value.findings[0].message.length < 400);
    assert.ok(ms < allowed(3000), `took ${ms} ms`);
  }
});

test('a million commas, a million line ends and a header of a thousand columns are refused or skipped in good time', () => {
  const commas = timed(() => checkText(`${SMALL.join(',')}\nshipping${','.repeat(1000000)}\n`));
  assert.equal(commas.value.findings[0].id, 'file-unreadable');
  assert.match(commas.value.findings[0].message, new RegExp(`more than ${CSV_LIMITS.maxColumns} cells`));
  assert.ok(commas.ms < allowed(3000), `took ${commas.ms} ms`);
  const blank = timed(() => checkText(`${SMALL.join(',')}\n${'\n'.repeat(1000000)}receiving,LOT-1,1,cases,2101-03-01\n`));
  assert.equal(blank.value.analysis.summary.rows, 1);
  assert.ok(blank.ms < allowed(5000), `took ${blank.ms} ms`);
  const wide = timed(() => checkText(`${Array.from({ length: 1000 }, (_, i) => `c${i}`).join(',')}\n1\n`));
  assert.equal(wide.value.findings[0].id, 'file-unreadable');
  const cells = timed(() => checkText(`${COLUMN_NAMES.join(',')}\n${`${','.repeat(COLUMN_NAMES.length - 1)}\n`.repeat(100000)}`));
  assert.ok(cells.value.findings.some((f) => f.id === 'file-unreadable') || cells.value.analysis.summary !== null);
  assert.ok(cells.ms < allowed(10000), `took ${cells.ms} ms`);
});

test('numbers with thousands of digits are refused, not worked out, and the message stays short', () => {
  const huge = '1'.repeat(5000);
  const { value, ms } = timed(() => checkText(table([shipping({ quantity: huge, unit_of_measure: 'cases' }), receiving({ quantity: huge })])));
  assert.ok(value.findings.some((f) => f.id === 'quantity-not-positive' && /at most 40 digits/.test(f.message)));
  assert.ok(value.findings.every((f) => f.message.length < 700));
  assert.ok(ms < allowed(3000), `took ${ms} ms`);
  const exp = checkText(table([shipping({ quantity: '1e999999' })]));
  assert.ok(exp.findings.some((f) => f.id === 'quantity-not-positive'));
});

test('long strings in every column are read in good time, and the messages stay short', () => {
  const long = 'n'.repeat(15000);
  const row = Object.fromEntries(COLUMN_NAMES.map((c) => [c, long]));
  const { value, ms } = timed(() => checkText(table([row, { ...row, event_type: 'shipping' }])));
  assert.ok(value.findings.length >= 4);
  assert.ok(value.findings.every((x) => x.message.length < 900), value.findings.map((x) => x.message.length).join());
  assert.ok(value.notes.every((n) => n.length < 900));
  assert.ok(ms < allowed(5000), `took ${ms} ms`);
});

test('names such as __proto__, constructor and toString are only names: as columns, as kinds of event and as lot codes', () => {
  const header = '__proto__,constructor,hasOwnProperty,event_type,traceability_lot_code,quantity,unit_of_measure,event_date';
  const r = timed(() => checkText(`${header}\n1,2,3,__proto__,constructor,1,cases,2101-03-01\n1,2,3,shipping,__proto__,1,cases,2101-03-01\n1,2,3,receiving,__proto__,1,cases,2101-03-02\n1,2,3,receiving,toString,1,cases,2101-03-02\n`));
  assert.equal({}.polluted, undefined);
  assert.equal(r.value.findings.filter((f) => f.id === 'column-unknown').length, 3);
  assert.equal(r.value.findings.filter((f) => f.id === 'event-type-unknown').length, 1);
  assert.ok(!r.value.findings.some((f) => f.id === 'receiving-without-shipping' && /__proto__/.test(f.message)), 'a lot code of that name is matched like any other');
  assert.ok(r.value.findings.some((f) => f.id === 'receiving-without-shipping' && /toString/.test(f.message)));
  for (const type of ['__proto__', 'constructor', 'toString']) assert.deepEqual(checkText(table([shipping({ event_type: type })])).findings.map((f) => f.id), ['event-type-unknown'], type);
});

test('a clean table of ninety thousand rows (nearly three million cells) passes in good time', () => {
  const base = clean();
  const rows = [];
  for (let i = 0; i < 11250; i += 1) rows.push(...base.map((r) => ({ ...r, reference_document_number: `${r.reference_document_number}-${i}`, traceability_lot_code: r.traceability_lot_code ? `${r.traceability_lot_code}-${i}` : '', input_traceability_lot_code: r.input_traceability_lot_code ? `${r.input_traceability_lot_code}-${i}` : '' })));
  const { value, ms } = timed(() => checkText(table(rows)));
  assert.equal(value.analysis.summary.rows, 90000);
  assert.deepEqual(value.findings, []);
  assert.ok(ms < allowed(30000), `took ${ms} ms`);
});

test('a run leaves the folder as it was: the tool writes nothing', async () => {
  await withFiles(GOOD, async (dir) => {
    const before = (await readdir(dir, { recursive: true })).sort();
    await cli([...ARGS, '--format', 'sarif'], dir);
    await cli([...ARGS, '--json', '--explain'], dir);
    assert.deepEqual((await readdir(dir, { recursive: true })).sort(), before);
  });
  assert.equal((await run(GOOD, ARGS)).code, 0);
});
