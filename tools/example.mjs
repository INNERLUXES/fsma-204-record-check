// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// spreadsheets to examples/output. CI runs it and then fails if those files changed, so the example output in the
// repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The moment the examples are checked at, in the made-up year of their dates; every path is relative to the root of the
// repository.
export const NOW = '2101-03-10T12:00:00Z';
export const BAD = ['examples/bad/records.csv', '--now', NOW];
export const GOOD = ['examples/good/records.csv', '--now', NOW];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the bad file: the counts, a finding of every check but one, and the result.
export const EXPECTED = [
  'rows: 11 (1 harvesting, 1 cooling, 1 initial packing, 3 shipping, 3 receiving, 1 making a new product and 1 no known kind); 1 row left out as malformed',
  'columns: 31 in the header, 29 read, 1 not read',
  'findings: 21 (11 error, 8 warning, 2 info)',
  'The header has no "harvester_contact" column, but the rows of initial packing need the business name and phone number for the harvester (21 CFR 1.1330(a)(7))',
  'The column "Event Date" has the same name as column 11 once case and separators are ignored; only the first is read.',
  'The column "harvest_dat" is not a column the tool reads, so the values under it are not checked. Did you mean harvest_date?',
  'The event_date of row 1 (harvesting), "03/04/2101", is written like a date of the United States',
  'Row 1 (harvesting) holds the lot code LOT-H1, but 21 CFR 1.1320 assigns a traceability lot code',
  'Row 1 (harvesting) has no field or other growing area (produce), or the container (aquacultured food), which 21 CFR 1.1325(a)(1)(v) and (vi) lists',
  'The quantity of row 2 (cooling) is zero; a quantity must be above zero.',
  'Row 2 (cooling) has no reference document number, which 21 CFR 1.1325(b)(1)(vii) lists; the cell under "reference_document_number" is empty.',
  'The event_type of row 3, "Shiping", is not one of the seven critical tracking events of 21 CFR 1.1310. Did you mean shipping?',
  'Row 4 (initial packing) has no product description of the packed food, which 21 CFR 1.1330(a)(12) lists; the cell under "product_description" holds the placeholder "n/a".',
  'The quantity of row 4 (initial packing), 40, has no unit of measure in the unit_of_measure column.',
  'The receipt_date of row 4 (initial packing), 2101-03-05, is before the harvest_date, 2101-03-07.',
  'Row 5 (shipping) names the place it ships from as the source of the lot code LOT-Z9, but no row of the file assigns that lot code',
  'Row 5 (shipping) ships the lot code LOT-Z9, which no receiving row of the file receives.',
  'Row 6 (receiving) receives the lot code LOT-R5, which no shipping row of the file ships.',
  'By row 8 (receiving) the lot code LOT-Q1 is received 130 cases in total, more than the 120 cases that the shipping rows of the file ship.',
  'A cell of the column "product_description" is shaped like a mnemonic. The tool never reads a seed or a key, and the value is not shown.',
  'Row 9 (making a new product) uses the input lot code LOT-X0, which no row of the file holds.',
  'Row 10 has the same cells as row 8, on line 9, so one event is counted twice.',
  'Row 11 has 4 cells but the header has 31; the row was left out of every other check.',
  'The event_date of row 12 (shipping), 2101-04-20, is after the moment given with --now.',
  'not legal advice and not an FDA certification, and not a guarantee that the records are true or that a firm meets the rule',
  'RESULT: FAIL - 11 findings at or above error (11 error, 8 warning, 2 info)'
];
// What must not be reported: the check the bad file cannot hold, the seed, and a pass.
export const UNWANTED = ['ERROR    file-unreadable', 'lantern', 'RESULT: PASS'];

// What the README says of the good file: no finding.
export const GOOD_EXPECTED = [
  'rows: 14 (1 harvesting, 1 cooling, 3 initial packing, 1 first land-based receiving, 3 shipping, 3 receiving and 2 making a new product)',
  'findings: 0',
  'RESULT: PASS - no finding at or above error'
];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bad = await run(BAD);
  process.stdout.write(bad.out);
  expect('bad file', bad, 1, EXPECTED, UNWANTED);

  const good = await run(GOOD);
  expect('good file', good, 0, GOOD_EXPECTED, ['ERROR    ', 'WARNING  ', 'INFO     ', 'RESULT: FAIL', 'note: ']);
  // The good file also passes when warnings and notes fail the run.
  expect('good, fail on warning', await run([...GOOD, '--fail-on', 'warning']), 0, ['RESULT: PASS - no finding at or above warning'], []);
  expect('good, fail on info', await run([...GOOD, '--fail-on', 'info']), 0, ['RESULT: PASS - no finding at or above info'], []);
  // Without --now the good file still passes, and the report says that future-date did not run.
  expect('good, no --now', await run(['examples/good/records.csv']), 0, ['now: not given, so future-date did not run', 'note: no --now was given, so future-date did not run'], []);
  // A --now before the last date makes the good file fail.
  expect('good, earlier --now', await run(['examples/good/records.csv', '--now', '2101-02-20']), 1, ['ERROR    future-date', 'The event_date of row 1 (harvesting), 2101-03-01, is after the moment given with --now.'], []);
  // The bad file with only the errors shown still counts the rest.
  expect('bad, errors only', await run([...BAD, '--min-severity', 'error']), 1, ['findings: 11 (11 error); 10 below error not shown'], ['WARNING  ', 'INFO     ']);
  // A file that is not there stops the run with no report, and so does a --now that is not a date.
  expect('missing file', await run(['examples/none/records.csv']), 2, ['examples/none/records.csv: does not exist'], [], 'err');
  expect('now that is not a date', await run([...GOOD.slice(0, 1), '--now', '10/03/2101']), 2, ['--now: 10/03/2101 is written like a date of the United States'], [], 'err');

  // The README shows the head of the report of the bad file with its table of checks, one finding with its basis, the
  // table of event types and the end of the report, and the end of the report of the good file.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  const lines = bad.out.split('\n');
  const head = lines.slice(0, lines.findIndex((l) => l.startsWith('Findings ('))).join('\n');
  if (!readme.includes(head)) problems.push('README: the head of the sample output of the bad file differs from a real run');
  const explained = (await run([...BAD, '--explain'])).out.split('\n');
  const at = explained.findIndex((l) => l.includes('lot-code-new-at-shipping') && l.includes('examples/bad/records.csv:'));
  const sample = explained.slice(at, at + 5).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the sample finding of the lot code at shipping differs from a real run');
  const t = lines.findIndex((l) => l.startsWith('Event types ('));
  const table = lines.slice(t, t + 11).join('\n');
  if (t < 0 || !readme.includes(table)) problems.push('README: the table of event types of the bad file differs from a real run');
  const tail = lines.slice(-4).join('\n');
  if (!readme.includes(tail)) problems.push('README: the tail of the sample output of the bad file differs from a real run');
  const goodTail = good.out.split('\n').slice(-16).join('\n');
  if (!readme.includes(goodTail)) problems.push('README: the tail of the sample output of the good file differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/bad.txt'), bad.out);
  await writeFile(resolve(root, 'examples/output/good.txt'), good.out);
  const outputs = [
    ['bad-explain.txt', [...BAD, '--explain'], 1],
    ['bad.md', [...BAD, '--format', 'markdown'], 1],
    ['bad-explain.md', [...BAD, '--format', 'markdown', '--explain'], 1],
    ['bad.json', [...BAD, '--json', '--explain'], 1],
    ['bad.sarif', [...BAD, '--format', 'sarif'], 1],
    ['good.md', [...GOOD, '--format', 'markdown'], 0],
    ['good.json', [...GOOD, '--json'], 0],
    ['good.sarif', [...GOOD, '--format', 'sarif'], 0],
    ['checks.txt', ['--list-checks'], 0],
    ['checks.json', ['--list-checks', '--format', 'json'], 0]
  ];
  for (const [name, args, code] of outputs) {
    const r = await run(args);
    if (r.code !== code) problems.push(`${name}: exit code ${r.code}, expected ${code}`);
    await writeFile(resolve(root, 'examples/output', name), r.out);
  }

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
