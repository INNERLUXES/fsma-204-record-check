import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/index.js';
import { BAD, EXPECTED, GOOD, GOOD_EXPECTED, NOW, UNWANTED, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');
const BAD_FILE = 'examples/bad/records.csv';
const GOOD_FILE = 'examples/good/records.csv';

test('examples: the bad file fails with the report that is saved in examples/output', async () => {
  const r = await run(BAD);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('bad.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the good file passes at error, warning and info level with the report that is saved', async () => {
  const r = await run(GOOD);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('good.txt'));
  for (const e of GOOD_EXPECTED) assert.ok(r.out.includes(e), e);
  assert.equal((await run([...GOOD, '--fail-on', 'warning'])).code, 0);
  assert.equal((await run([...GOOD, '--fail-on', 'info'])).code, 0);
  assert.doesNotMatch(r.out, /ERROR {4}|WARNING {2}|INFO {5}/);
  assert.doesNotMatch(r.out, /\nnote: /);
  assert.equal(NOW, '2101-03-10T12:00:00Z');
});

test('examples: every output saved in examples/output is the real output, in all four formats for both files', async () => {
  const outputs = {
    'bad-explain.txt': [...BAD, '--explain'],
    'bad.md': [...BAD, '--format', 'markdown'],
    'bad-explain.md': [...BAD, '--format', 'markdown', '--explain'],
    'bad.json': [...BAD, '--json', '--explain'],
    'bad.sarif': [...BAD, '--format', 'sarif'],
    'good.md': [...GOOD, '--format', 'markdown'],
    'good.json': [...GOOD, '--json'],
    'good.sarif': [...GOOD, '--format', 'sarif'],
    'checks.txt': ['--list-checks'],
    'checks.json': ['--list-checks', '--format', 'json']
  };
  for (const [name, args] of Object.entries(outputs)) assert.equal((await run(args)).out, await saved(name), name);
});

test('examples: every check but file-unreadable fires on the bad file, each on the line built for it', async () => {
  const report = JSON.parse((await run([...BAD, '--json'])).out);
  const lines = (await readFile(resolve(root, BAD_FILE), 'utf8')).split('\n');
  // The line of the n-th line that holds needle.
  const at = (needle, n = 1) => {
    let seen = 0;
    for (let i = 0; i < lines.length; i += 1) if (lines[i].includes(needle) && (seen += 1) === n) return `${BAD_FILE}:${i + 1}`;
    throw new Error(`${needle} x${n}`);
  };
  const where = (id) => report.findings.filter((f) => f.id === id).map((f) => f.at);
  assert.deepEqual(RULES.map((r) => r.id).filter((id) => where(id).length === 0), ['file-unreadable']);
  assert.deepEqual(where('column-missing'), [`${BAD_FILE}:1`]);
  assert.deepEqual(where('column-duplicate'), [`${BAD_FILE}:1`]);
  assert.deepEqual(where('column-unknown'), [`${BAD_FILE}:1`]);
  assert.deepEqual(where('date-invalid'), [at('03/04/2101')]);
  assert.deepEqual(where('lot-code-at-harvest-or-cooling'), [at('LOT-H1')]);
  assert.deepEqual(where('kde-conditional-missing'), [at('LOT-H1')]);
  assert.deepEqual(where('quantity-not-positive'), [at('cooling,')]);
  assert.deepEqual(where('kde-missing'), [at('cooling,'), at('LOT-P3')]);
  assert.deepEqual(where('event-type-unknown'), [at('Shiping')]);
  assert.deepEqual(where('quantity-unit-missing'), [at('LOT-P3')]);
  assert.deepEqual(where('dates-out-of-order'), [at('LOT-P3')]);
  assert.deepEqual(where('lot-code-new-at-shipping'), [at('LOT-Z9')]);
  assert.deepEqual(where('shipping-without-receiving'), [at('LOT-Z9')]);
  assert.deepEqual(where('receiving-without-shipping'), [at('LOT-R5')]);
  assert.deepEqual(where('received-more-than-shipped'), [at('receiving,LOT-Q1')]);
  assert.deepEqual(where('duplicate-row'), [at('receiving,LOT-Q1', 2)]);
  assert.deepEqual(where('made-from-unknown-lot'), [at('LOT-X0')]);
  assert.deepEqual(where('secret-in-file'), [at('lantern')]);
  assert.deepEqual(where('row-malformed'), [at('LOT-W4')]);
  assert.deepEqual(where('future-date'), [at('2101-04-20')]);
});

test('examples: the files are plain ASCII with LF line ends, in the made-up year, with 555-01 phone numbers and no key', async () => {
  for (const file of [BAD_FILE, GOOD_FILE]) {
    const text = await readFile(resolve(root, file), 'utf8');
    assert.ok([...text].every((c) => c.charCodeAt(0) < 128), file);
    assert.ok(!text.includes('\r'), file);
    for (const m of text.matchAll(/\b(\d{4})-\d{2}-\d{2}\b/g)) assert.equal(m[1], '2101', `${file}: ${m[0]}`);
    for (const m of text.matchAll(/\b555-(\d{4})\b/g)) assert.match(m[1], /^01\d\d$/, file);
    assert.doesNotMatch(text, /\b(?:19|20)\d{2}\b/, file);
  }
  assert.doesNotMatch(await readFile(resolve(root, GOOD_FILE), 'utf8'), /lantern/);
});

test('examples: the good file has a row of every kind of event, and the bad file has none that the good one lacks', async () => {
  const good = JSON.parse((await run([...GOOD, '--json'])).out);
  assert.deepEqual(good.eventTypes.map((t) => t.id), ['harvesting', 'cooling', 'initial_packing', 'first_land_based_receiving', 'shipping', 'receiving', 'transformation']);
  assert.equal(good.records.rows, 14);
  assert.deepEqual(good.findings, []);
  assert.deepEqual(good.notes, []);
  const bad = JSON.parse((await run([...BAD, '--json'])).out);
  assert.equal(bad.totals.findings, 21);
  assert.equal(bad.records.skipped, 1);
});

test('examples: the good file gives the same result with CRLF, with a byte order mark and as UTF-16', async () => {
  const text = await readFile(resolve(root, GOOD_FILE), 'utf8');
  const { withFiles, cli } = await import('./helpers.js');
  const variants = {
    'crlf.csv': text.replace(/\n/g, '\r\n'),
    'utf16.csv': Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]),
    'bom.csv': Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)])
  };
  await withFiles(variants, async (dir) => {
    for (const name of Object.keys(variants)) {
      const r = await cli([name, '--now', NOW], dir);
      assert.equal(r.code, 0, name);
      assert.match(r.out, /\nfindings: 0\n/, name);
    }
  });
});
