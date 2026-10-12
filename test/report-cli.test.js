import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, USAGE, VERSION, buildReport, checkText, listChecksJson, listChecksMarkdown, listChecksText, main, parseArgs, toJson, toMarkdown, toSarif, toText } from '../src/index.js';
import { ARGS, BAD, GOOD, NOW, clean, cli, harvesting, receiving, run, shipping, table, withFiles } from './helpers.js';

const ch = (...codes) => String.fromCharCode(...codes);
// A file with an error and a warning: a date that does not exist, and no growing area.
const MIXED = { 'records.csv': table([harvesting({ event_date: '2101-02-30', growing_area: '' })]) };
const WARN = { 'w.csv': table([harvesting({ growing_area: '' })]) };
const mem = { file: 'mem.csv', format: 'CSV', bytes: 1, lines: 1 };

test('exit codes: 0 for a pass, 1 for a finding at or above the fail-on level, 2 for a usage or input error', async () => {
  assert.equal((await run(GOOD, ARGS)).code, 0);
  assert.equal((await run(BAD, ARGS)).code, 1);
  assert.equal((await run(GOOD, ['nothing.csv'])).code, 2);
  assert.equal((await run(GOOD, [])).code, 2);
  assert.equal((await run(GOOD, ['records.csv', 'other.csv'])).code, 2);
  assert.equal((await run(GOOD, ['records.csv', '--bogus'])).code, 2);
  const none = await run({}, ['a.csv']);
  assert.equal(none.code, 2);
  assert.match(none.err, /the input has a problem:\n {2}a\.csv: does not exist\n/);
  assert.equal(none.out, '');
});

test('--fail-on and --min-severity: a warning fails the run at warning, and a hidden finding still counts for the result', async () => {
  assert.equal((await run(WARN, ['w.csv'])).code, 0);
  assert.equal((await run(WARN, ['w.csv', '--fail-on', 'warning'])).code, 1);
  assert.equal((await run(WARN, ['w.csv', '--fail-on', 'info'])).code, 1);
  const r = await run(MIXED, [...ARGS, '--min-severity', 'error']);
  assert.match(r.out, /findings: 1 \(1 error\); 1 below error not shown\n/);
  const hidden = await run(WARN, ['w.csv', '--min-severity', 'error', '--fail-on', 'warning']);
  assert.match(hidden.out, /findings: 0; 1 below error not shown/);
  assert.equal(hidden.code, 1);
  const info = { 'i.csv': table([shipping()]) };
  assert.equal((await run(info, ['i.csv'])).code, 0, 'a warning and a note do not fail the run at error');
  assert.equal((await run(info, ['i.csv', '--fail-on', 'warning'])).code, 1, 'the lot code is new at shipping, a warning');
  const note = { 'n.csv': table([receiving()]) };
  assert.equal((await run(note, ['n.csv'])).code, 0);
  assert.equal((await run(note, ['n.csv', '--fail-on', 'info'])).code, 1, 'a note fails the run at info');
});

test('--now: a day or a moment with a zone, given once, that turns future-date on', async () => {
  assert.equal(parseArgs(['r.csv']).now, null);
  assert.equal(parseArgs(['r.csv', '--now', NOW]).now, NOW);
  assert.equal(parseArgs(['r.csv', '--now', '2101-03-10']).now, '2101-03-10');
  assert.equal(parseArgs(['r.csv', '--now', '2101-03-10T13:00:00.5+01:00']).now, '2101-03-10T13:00:00.5+01:00');
  for (const [bad, why] of [['2101-03-10T12:00:00', /has no time zone/], ['10/03/2101', /written like a date of the United States/], ['2101-02-30', /has the day 30/], ['now', /is not a date written/]]) assert.throws(() => parseArgs(['r.csv', '--now', bad]), (e) => e.message.startsWith(`--now: ${bad} `) && why.test(e.message), bad);
  assert.throws(() => parseArgs(['r.csv', '--now', NOW, '--now', NOW]), /given twice/);
  const late = { 'r.csv': table([shipping({ event_date: '2101-03-20' })]) };
  assert.equal((await run(late, ['r.csv', '--fail-on', 'error'])).code, 0);
  const r = await run(late, ['r.csv', '--now', NOW]);
  assert.equal(r.code, 1);
  assert.match(r.out, /ERROR {4}future-date/);
  assert.match(r.out, /\nnow: 2101-03-10T12:00:00Z, from --now\n/);
  assert.match((await run(late, ['r.csv'])).out, /\nnow: not given, so future-date did not run\n[\s\S]*\nnote: no --now was given, so future-date did not run\n/);
});

test('arguments: formats, options that need a value, options given twice, a URL, standard input and unknown levels', () => {
  assert.equal(parseArgs(['r.csv']).format, 'text');
  assert.equal(parseArgs(['r.csv', '--json']).format, 'json');
  assert.equal(parseArgs(['r.csv', '--json', '--format', 'json']).format, 'json');
  assert.throws(() => parseArgs(['r.csv', '--json', '--format', 'sarif']), /ask for two formats/);
  assert.throws(() => parseArgs(['r.csv', '--format', 'xml']), /unknown format xml/);
  assert.throws(() => parseArgs(['r.csv', '--format']), /--format needs a value/);
  assert.throws(() => parseArgs(['r.csv', '--format', '--json']), /--format needs a value/);
  assert.throws(() => parseArgs(['r.csv', '--format', 'text', '--format', 'json']), /--format was given twice/);
  assert.throws(() => parseArgs(['r.csv', '--fail-on', 'fatal']), /--fail-on: unknown level fatal \(info, warning, error\)/);
  assert.throws(() => parseArgs(['r.csv', '--min-severity', 'loud']), /--min-severity: unknown level loud/);
  assert.throws(() => parseArgs(['https://example.com/r.csv']), /give a local path; the tool never fetches a URL/);
  assert.throws(() => parseArgs(['-']), /reading from standard input is not supported/);
  assert.throws(() => parseArgs(['r.csv', '--now', '-']), /reading from standard input is not supported/);
  assert.throws(() => parseArgs(['r.csv', '--format', 'sarif', '--explain']), /the sarif format has no place for them/);
  assert.throws(() => parseArgs(['--list-checks', '--format', 'sarif']), /--list-checks has no SARIF form/);
  assert.doesNotThrow(() => parseArgs(['--list-checks']));
  assert.doesNotThrow(() => parseArgs(['--help']));
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['-v']).version, true);
});

test('--help, --version and --list-checks need no file and exit 0; a usage error prints the usage on standard error', async () => {
  const help = await cli(['--help'], process.cwd());
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  assert.match(USAGE, /^Usage: fsma-204-record-check <records\.csv> \[options\]/);
  for (const r of RULES) assert.ok(USAGE.includes(r.id), r.id);
  assert.equal((await cli(['--version'], process.cwd())).out, `${VERSION}\n`);
  assert.equal(VERSION, '1.0.0');
  const bad = await cli(['--format', 'nope', 'r.csv'], process.cwd());
  assert.equal(bad.code, 2);
  assert.match(bad.err, /^fsma-204-record-check: unknown format nope/);
  assert.ok(bad.err.includes(USAGE));
  assert.equal(bad.out, '');
  for (const format of ['text', 'markdown', 'json']) assert.equal((await cli(['--list-checks', '--format', format], process.cwd())).code, 0, format);
});

test('--list-checks: every check with its level and kind, in text, markdown and JSON', () => {
  const text = listChecksText();
  for (const r of RULES) assert.ok(text.includes(r.id) && text.includes(r.summary), r.id);
  assert.match(text, /None of it is legal advice or an FDA certification\.\n$/);
  const md = listChecksMarkdown();
  assert.equal(md.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Check') && !l.startsWith('| ---')).length, RULES.length);
  const json = JSON.parse(listChecksJson());
  assert.deepEqual(json.map((x) => x.id), RULES.map((r) => r.id));
  assert.ok(json.every((x) => ['info', 'warning', 'error'].includes(x.severity) && ['input', 'documented', 'best practice'].includes(x.kind)));
  assert.equal(json.find((x) => x.id === 'future-date').own.startsWith('refusing a date from the future is a best practice of this tool'), true);
  assert.equal(json.find((x) => x.id === 'kde-missing').own, null);
});

test('--explain: the sections of the rule behind each finding, and the tool\'s own choice for a best practice check', async () => {
  const plain = await run(MIXED, ARGS);
  assert.doesNotMatch(plain.out, /basis:|own choice/);
  const r = await run(MIXED, [...ARGS, '--explain']);
  assert.match(r.out, /basis: .*\(21 CFR 1\.1325 to 1\.1350, https:\/\/www\.ecfr\.gov\/current\/title-21\//);
  const best = await run({ 'records.csv': table([shipping()]) }, [...ARGS, '--explain', '--min-severity', 'info']);
  assert.match(best.out, /the tool's own choice: matching a shipment with a receipt is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S;/);
  const md = await run(MIXED, [...ARGS, '--explain', '--format', 'markdown']);
  assert.match(md.out, /\n## Basis\n\n### date-invalid\n\n- /);
  const json = JSON.parse((await run(MIXED, [...ARGS, '--explain', '--json'])).out);
  assert.ok(json.findings.every((f) => Array.isArray(f.basis)));
  const noExplain = JSON.parse((await run(MIXED, [...ARGS, '--json'])).out);
  assert.ok(noExplain.findings.every((f) => f.basis === undefined && f.own === undefined));
  const input = await run({ 'records.csv': 'a,b\n1\n' }, [...ARGS, '--format', 'markdown', '--explain']);
  assert.match(input.out, /A problem with the file itself; it rests on no section of the rule\./);
});

test('text report: what was read, the checks with their counts, the findings with their fix, the table of event types and the result', async () => {
  const r = await run(GOOD, [...ARGS, '--now', NOW]);
  assert.match(r.out, /^fsma-204-record-check: records\.csv\nfile: records\.csv \(CSV, \d+ lines?, [\d,]+ bytes\)\nrows: 8 \(/);
  assert.match(r.out, /\ncolumns: 31 in the header, 31 read, 0 not read\n/);
  assert.match(r.out, /\nlots: 4 traceability lot codes\n/);
  assert.match(r.out, /\nevent dates: from 2101-03-01 to 2101-03-04\n/);
  assert.match(r.out, /\nChecks \(21\)\n/);
  assert.match(r.out, /\nFindings \(0\)\n\n {2}none\n/);
  assert.match(r.out, /\nEvent types \(7\)\n\n {2}event type +rows +lot codes\n/);
  assert.match(r.out, /\n {2}making a new product +1 +1\n/);
  assert.match(r.out, /\nRESULT: PASS - no finding at or above error\n$/);
  const bad = await run(MIXED, [...ARGS, '--now', NOW]);
  assert.match(bad.out, /\n {2}ERROR {4}date-invalid {20}records\.csv:2\n {11}The event_date of row 1 \(harvesting\), "2101-02-30", has the day 30, but month 02 of 2101 has 28 days\.\n {11}fix: Write the date as YYYY-MM-DD: four digits for the year, two for the month and two for the day.\n/);
  assert.match(bad.out, /\nRESULT: FAIL - 1 finding at or above error \(1 error, 1 warning\)\n$/);
});

test('JSON report: one object with the file, the rows, the totals, every check, every finding and the result', async () => {
  const r = JSON.parse((await run(MIXED, [...ARGS, '--json', '--now', NOW])).out);
  assert.equal(r.tool, 'fsma-204-record-check');
  assert.equal(r.version, VERSION);
  assert.deepEqual(r.input, { file: 'records.csv', format: 'CSV', bytes: r.input.bytes, lines: 2 });
  assert.equal(r.records.rows, 1);
  assert.deepEqual(r.totals, { findings: 2, byLevel: { error: 1, warning: 1, info: 0 }, hidden: 0 });
  assert.equal(r.rules.length, RULES.length);
  assert.deepEqual(r.options, { minSeverity: 'info', failOn: 'error', now: NOW });
  assert.deepEqual(r.findings.map((f) => f.id), ['date-invalid', 'kde-conditional-missing']);
  const f = r.findings[0];
  assert.deepEqual(Object.keys(f).sort(), ['at', 'column', 'file', 'fix', 'id', 'kind', 'line', 'message', 'severity', 'subject']);
  assert.equal(f.at, `records.csv:${f.line}`);
  assert.deepEqual(r.result, { pass: false, failOn: 'error', text: 'FAIL - 1 finding at or above error (1 error, 1 warning)' });
  assert.match(r.notice, /not legal advice and not an FDA certification/);
});

test('SARIF report: SARIF 2.1.0 with the checks as rules, the file as the artifact and a region for each finding', async () => {
  const r = JSON.parse((await run(MIXED, [...ARGS, '--format', 'sarif'])).out);
  assert.equal(r.version, '2.1.0');
  const run0 = r.runs[0];
  assert.equal(run0.tool.driver.name, 'fsma-204-record-check');
  assert.equal(run0.tool.driver.rules.length, RULES.length);
  assert.deepEqual(run0.artifacts, [{ location: { uri: 'records.csv' } }]);
  const [first, second] = run0.results;
  assert.equal(first.ruleId, 'date-invalid');
  assert.equal(first.level, 'error');
  assert.equal(run0.tool.driver.rules[first.ruleIndex].id, 'date-invalid');
  assert.equal(first.locations[0].physicalLocation.region.startLine, 2);
  assert.ok(first.locations[0].physicalLocation.region.startColumn > 1);
  assert.equal(second.level, 'warning');
  const note = JSON.parse((await run({ 'records.csv': table([receiving()]) }, [...ARGS, '--format', 'sarif'])).out);
  assert.equal(note.runs[0].results[0].level, 'note');
});

test('markdown report: a table of findings with the characters markdown gives a meaning to escaped', async () => {
  // A file name may not hold a bar on Windows, so the bar is in a cell and the other characters are in the name.
  const name = 'a_b `c` [d](e)#~.csv';
  const hostile = { [name]: table([shipping({ event_type: 'ship*ping_<b>[x](y)|z' })]) };
  const r = await run(hostile, [name, '--format', 'markdown']);
  assert.match(r.out, /^# fsma-204-record-check: a\\_b \\`c\\` \\\[d\\\]\\\(e\\\)\\#\\~\.csv\n/);
  assert.doesNotMatch(r.out, /<b>|\[x\]\(y\)/);
  assert.match(r.out, /ship\\\*ping\\_\\<b\\>\\\[x\\\]\\\(y\\\)\\\|z/);
  const good = await run(GOOD, [...ARGS, '--format', 'markdown']);
  assert.match(good.out, /\n## Findings\n\nNone\.\n/);
  assert.match(good.out, /\n- Result: \*\*PASS - no finding at or above error\*\*\n/);
});

test('text from the file is cleaned: control, line separator and direction characters never reach a report', async () => {
  const evil = `ship${ch(27)}[31mping${ch(0x202e)}${ch(0x2028)}${ch(0x85)}`;
  for (const format of ['text', 'markdown', 'json', 'sarif']) {
    const r = await run({ 'records.csv': table([shipping({ event_type: evil })]) }, [...ARGS, '--format', format]);
    assert.ok(![27, 0x202e, 0x2028, 0x85].some((c) => r.out.includes(ch(c))), format);
    assert.match(r.out, /ship\s*\\?\[31mping/, format);
  }
  const name = await run({ [`na${ch(0x202e)}me.csv`]: table([shipping()]) }, [`na${ch(0x202e)}me.csv`]);
  assert.ok(!name.out.includes(ch(0x202e)));
});

test('line ends and encodings: LF, CRLF, CR, a byte order mark and UTF-16 give the same findings', async () => {
  const lf = table([harvesting({ event_date: '2101-02-30' }), shipping({ quantity: '0' })]);
  const reference = (await run({ 'r.csv': lf }, ['r.csv', '--json'])).out;
  const same = async (name, content) => assert.equal((await run({ 'r.csv': content }, ['r.csv', '--json'])).out.replace(/"bytes": \d+,/, '').replace(/"lines": \d+/, ''), reference.replace(/"bytes": \d+,/, '').replace(/"lines": \d+/, ''), name);
  await same('CRLF', lf.replace(/\n/g, '\r\n'));
  await same('CR', lf.replace(/\n/g, '\r'));
  await same('byte order mark', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(lf)]));
  await same('UTF-16 little endian', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(lf, 'utf16le')]));
  await same('UTF-16 big endian', Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(lf, 'utf16le').swap16()]));
});

test('buildReport: the result is decided on all findings, not on the ones shown', () => {
  const checked = checkText(table([harvesting({ event_date: '2101-02-30', growing_area: '' })]));
  const r = buildReport({ file: mem, checked, version: '9', minSeverity: 'error', failOn: 'warning' });
  assert.equal(r.version, '9');
  assert.equal(r.findings.length, 1);
  assert.equal(r.result.pass, false);
  assert.equal(r.totals.hidden, 1);
  assert.equal(toText(r).includes('RESULT: FAIL'), true);
  assert.equal(toMarkdown(r).includes('| error | date-invalid |'), true);
  assert.equal(JSON.parse(toJson(r)).version, '9');
  assert.equal(JSON.parse(toSarif(r)).runs[0].tool.driver.version, '9');
});

test('a run needs one file and reads nothing else: the folder is as it was and the report names the file given', async () => {
  await withFiles({ 'sub/records.csv': GOOD['records.csv'], 'other.csv': 'x\n' }, async (dir) => {
    const r = await cli(['sub/records.csv'], dir);
    assert.equal(r.code, 0);
    assert.match(r.out, /^fsma-204-record-check: sub\/records\.csv\n/);
  });
  assert.equal((await main(['--version'], { out: () => {}, err: () => {} })), 0);
  assert.equal(clean().length, 8);
});
