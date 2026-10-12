import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, checkText } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (rel) => readFile(resolve(root, rel), 'utf8');
const HOMEPAGE = 'https://innerluxes.dev/blockchain/food-supply-chain';
const LINK_TEXT = 'Blockchain Food Traceability Software Development Services';
const DECISIONS = ['docs/decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md', 'docs/decisions/0002-read-csv-with-a-reader-of-its-own-and-never-show-a-secret.md', 'docs/decisions/0003-check-the-records-on-disk-and-contact-nothing.md'];
// The pattern of tools/check.mjs, kept unchanged: a word of four digits that starts with 19 or 20 reads like a year,
// unless it is the number of a standard after EIP or ERC.
const YEAR = /(?<!(?:EIP|ERC)[- ]?)\b(?:19|20)\d{2}\b/i;
const DATE = /\b(\d{4})-\d{2}-\d{2}\b/g;
const MADE_UP_YEAR = '2101';
const NOT_A = 'not legal advice and not an FDA certification, and not a guarantee that the records are true or that a firm meets the rule';
const norm = (t) => t.replace(/\s+/g, ' ');

// Every file below a folder of the repository, with forward slashes.
async function filesOf(dir) {
  const out = [];
  const walk = async (rel) => {
    for (const e of await readdir(resolve(root, rel), { withFileTypes: true })) {
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) await walk(r);
      else out.push(r);
    }
  };
  await walk(dir);
  return out.sort();
}

// Every file of the repository that is committed.
async function allFiles() {
  const out = [];
  const walk = async (rel) => {
    for (const e of await readdir(resolve(root, rel || '.'), { withFileTypes: true })) {
      if (['.git', 'coverage'].includes(e.name) || (!rel && ['dist', 'node_modules'].includes(e.name))) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(r);
      else out.push(r);
    }
  };
  await walk('');
  return out.sort();
}

const docFiles = async () => ['README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'research/sources.md', ...(await filesOf('docs')).filter((f) => f.endsWith('.md'))];

test('package.json: a zero-dependency Node 22 ES module with the bin, the scripts, the author, the repository and the homepage', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.name, 'fsma-204-record-check');
  assert.equal(pkg.version, '1.0.0');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.engines.node, '>=22');
  assert.equal(pkg.homepage, HOMEPAGE);
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.author, 'INNERLUXES <info@innerluxes.dev>');
  assert.equal(pkg.repository.url, 'git+https://github.com/INNERLUXES/fsma-204-record-check.git');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.equal(pkg.bin['fsma-204-record-check'], 'bin/fsma-204-record-check.js');
  for (const k of ['fsma', 'fsma-204', 'food-traceability', 'fda', 'traceability', 'food-safety', 'supply-chain', 'blockchain', 'data-quality', 'csv', 'cli', 'nodejs']) assert.ok(pkg.keywords.includes(k), k);
  assert.match(pkg.description, /^FSMA 204 record check: /);
  assert.match(pkg.description, /Not legal advice and not an FDA certification\./);
  for (const script of ['test', 'check', 'example', 'test:coverage']) assert.ok(pkg.scripts[script], script);
  assert.equal(pkg.scripts.test, 'node --test "test/*.test.js"');
  const lock = JSON.parse(await read('package-lock.json'));
  assert.deepEqual(Object.keys(lock.packages), ['']);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.name, pkg.name);
  assert.ok((await read('bin/fsma-204-record-check.js')).startsWith('#!/usr/bin/env node\n'));
});

test('README: one link to the page on blockchain food traceability development, with its title, in the closing Background section', async () => {
  const readme = await read('README.md');
  const parts = readme.split(/^## /m);
  const background = parts.find((p) => p.startsWith('Background'));
  assert.ok(background, 'a Background section');
  assert.ok(norm(background).includes(`[${LINK_TEXT}](${HOMEPAGE})`));
  assert.equal(readme.split('innerluxes.dev/').length - 1, 1, 'the README links to the site once');
  assert.equal(readme.split(HOMEPAGE).length - 1, 1);
  assert.equal(parts.at(-1).split('\n')[0], 'License');
  assert.equal(parts.at(-2).split('\n')[0], 'Background');
});

test('README: the npm test block shows the summary counts with no symbol in front, and they add up', async () => {
  const readme = await read('README.md');
  const block = /```\n(tests (\d+)\npass (\d+)\nfail (\d+)\nskipped (\d+))\n```/.exec(readme);
  assert.ok(block, 'the npm test block');
  const [, , tests, pass, fail, skipped] = block.map(Number);
  assert.equal(pass + fail + skipped, tests);
  assert.equal(fail, 0);
  assert.ok(tests >= 100);
});

test('README: what it checks, how to run it with npx or node, the options, the example output and the limits', async () => {
  const readme = await read('README.md');
  for (const heading of ['## Quick start', '## Usage', '## How the file is read', '## What it checks', '## What is not checked', '## Formats', '## Exit codes', '## Limits', '## Architecture', '## Where the facts come from']) assert.ok(readme.includes(`\n${heading}\n`), heading);
  assert.match(readme, /npx --yes github:INNERLUXES\/fsma-204-record-check records\.csv --now 2101-03-10/);
  assert.match(readme, /node bin\/fsma-204-record-check\.js examples\/bad\/records\.csv --now 2101-03-10T12:00:00Z/);
  for (const option of ['--format', '--json', '--min-severity', '--fail-on', '--now', '--explain', '--list-checks', '--help', '--version']) assert.ok(readme.includes(option), option);
  for (const r of RULES) assert.ok(readme.includes(`| \`${r.id}\` | ${r.severity} | ${r.kind} |`), `README: ${r.id}`);
  assert.ok(readme.includes('https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S'));
  for (const f of ['text', 'markdown', 'JSON', 'SARIF']) assert.ok(readme.includes(f), f);
  assert.match(readme, /Twenty-one checks/);
  assert.match(readme, /Seven are documented/);
  assert.equal(RULES.length, 21);
  assert.equal(RULES.filter((r) => r.kind === 'documented').length, 7);
  assert.ok(!readme.includes('@@') && !/@[A-Z]+@/.test(readme), 'no placeholder is left');
});

test('README and documents: not legal advice, not an FDA certification and not a guarantee, said plainly and before the quick start', async () => {
  for (const file of ['README.md', 'docs/limits.md', 'docs/method.md', 'docs/secure-defaults.md', 'docs/threat-model.md', 'docs/rules-and-sources.md', 'docs/inputs.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'research/sources.md', DECISIONS[1]]) assert.ok(norm(await read(file)).includes(NOT_A), file);
  const readme = norm(await read('README.md'));
  assert.ok(readme.indexOf('not legal advice and not an FDA certification') < readme.indexOf('## Quick start'), 'said before the quick start');
  assert.ok(readme.includes('it contacts nothing over the network, runs nothing, needs no key, reads no clock and writes nothing'));
  assert.ok(readme.includes('heuristic'));
  assert.match(await read('docs/limits.md'), /^The tool is not legal advice and not an FDA certification/m);
});

test('README and documents: they never say that a firm complies, that FDA accepts the file or that the records are certified', async () => {
  for (const file of await docFiles()) {
    const text = norm(await read(file));
    assert.doesNotMatch(text, /\b(?:is|are|be|becomes?) (?:FSMA|FDA)[- ](?:compliant|certified|approved)\b/i, file);
    assert.doesNotMatch(text, /(?<!not a )\bguarantees? (?:compliance|that the records are true|FDA acceptance)\b/i, file);
    assert.doesNotMatch(text, /\bcertif(?:y|ies|ied) (?:that )?(?:a firm|your firm|your records|the records)\b/i, file);
  }
});

test('docs/inputs.md: the short file passes every check', async () => {
  const inputs = await read('docs/inputs.md');
  const csv = /### A short file\n\n[^\n]*\n\n```csv\n([\s\S]*?)\n```/.exec(inputs)[1];
  const r = checkText(`${csv}\n`);
  assert.deepEqual(r.findings.map((f) => f.id), []);
  assert.equal(r.analysis.summary.rows, 2);
});

test('README and documents: no number that reads like a year and no date in words; every full date is in the made-up year', async () => {
  for (const file of await docFiles()) {
    const text = await read(file);
    if (file !== 'research/sources/ecfr-21-cfr-1-subpart-s.txt') assert.doesNotMatch(text, YEAR, file);
    assert.doesNotMatch(text, /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/, file);
  }
  for (const file of await allFiles()) {
    if (file.startsWith('research/sources/') || file === 'tools/check.mjs') continue;
    const text = await read(file);
    assert.doesNotMatch(text, YEAR, file);
    for (const m of text.matchAll(DATE)) assert.equal(m[1], MADE_UP_YEAR, `${file}: ${m[0]}`);
  }
  // The saved copy of the rule is the rule's own words: it is read for no year, but it holds no full date.
  for (const file of await filesOf('research/sources')) assert.doesNotMatch(await read(file), /\b\d{4}-\d{2}-\d{2}\b/, file);
  for (const file of ['package.json', ...DECISIONS, ...(await filesOf('src'))]) assert.doesNotMatch(await read(file), /\b\d{4}-\d{2}-\d{2}\b/, file);
  assert.match(await read('CHANGELOG.md'), /^## 1\.0\.0$/m);
  assert.doesNotMatch(await read('LICENSE'), /Copyright \(c\) \d/);
});

test('the year pattern passes over versions, seconds, counts, section numbers and identifiers and still catches a year', () => {
  for (const ok of ['1.0.0', 'Node 22', '21 CFR 1.1340', 'SARIF 2.1.0', 'RFC 8259', '846,000 seconds', '100,000 rows', 'NIST SP 800-218', 'BOL-1001', '2101-03-10T12:00:00Z', '555-0111', 'ST 00001']) assert.doesNotMatch(ok, YEAR, ok);
  const year = ['20', '24'].join('');
  const old = ['19', '99'].join('');
  for (const bad of [year, `in ${year}`, old, `${year}.`, `lot ${['20', '01'].join('')}`, `BOL-${['20', '01'].join('')}`]) assert.match(bad, YEAR, bad);
});

test('README and documents: plain ASCII, with no emoji and no decorative character', async () => {
  for (const file of [...(await docFiles()), '.github/pull_request_template.md', '.github/CODEOWNERS', 'package.json', ...(await filesOf('research/sources'))]) {
    const text = await read(file);
    assert.ok([...text].every((c) => c.charCodeAt(0) < 128), file);
  }
});

test('every file: none of the words this project keeps out of its prose, and no name of a tool that wrote it', async () => {
  // Built from pieces, so that this file does not hold the words; a word is matched at its start. The value of the
  // event_type column that begins with one of them is the rule's own name, and is taken out first, as tools/check.mjs does.
  const words = [['har', 'ness'], ['del', 'v'], ['lever', 'ag'], ['seam', 'less'], ['rob', 'ust'], ['cutting', '-edg'], ['un', 'lock'], ['em', 'power'], ['ele', 'vat'], ['stream', 'lin'], ['game', '-changer'], ['tap', 'estr'], ['re', 'alm'], ['further', 'more'], ['more', 'over'], ['in today', "'s"], ['gene', 'rated'], ['trans', 'form'], ['compre', 'hensiv'], ['tail', 'ored'], ['state-of-the', '-art'], ['revol', 'ution'], ['holi', 'stic'], ['world', '-class']].map((p) => p.join(''));
  const banned = new RegExp(`\\b(?:${words.join('|')})`, 'i');
  const standardName = new RegExp(`(?<=^|[,\\t"'\`\\\\])${['trans', 'formation'].join('')}(?=$|[,\\t"'\`\\\\])`, 'gm');
  const names = new RegExp(`${['cla', 'ude'].join('')}|${['anthro', 'pic'].join('')}|\\b${['A', 'I'].join('')}\\b|\\b${['assis', 'tant'].join('')}|\\b${['ch', 'at'].join('')}\\b|\\b${['ses', 'sion'].join('')}|${['co-', 'authored'].join('')}|${['gene', 'rated'].join('')}`, 'i');
  for (const file of await allFiles()) {
    if (file === 'tools/check.mjs') continue;
    const text = await read(file);
    if (!file.startsWith('research/sources/')) assert.doesNotMatch(text.replace(standardName, ''), banned, file);
    assert.doesNotMatch(text, names, file);
    // One word of the list is kept out of the saved copy of the rule too.
    assert.doesNotMatch(text, new RegExp(['un', 'lock'].join(''), 'i'), file);
  }
  assert.match(`an ${['assis', 'tant'].join('')} wrote this`, names);
  assert.equal(`x,${['trans', 'formation'].join('')},y`.replace(standardName, ''), 'x,,y', 'the value of the column is passed over');
  assert.equal(['"', 'trans', 'formation', '"'].join('').replace(standardName, ''), '""');
  assert.match(`a ${['trans', 'formation'].join('')} of the business`.replace(standardName, ''), banned, 'the word itself, with a space next to it, is still caught');
  assert.match(`the ${['trans', 'form'].join('')}ed food`.replace(standardName, ''), banned);
});

test('no file holds a string shaped like a token or a private key', async () => {
  const shapes = [new RegExp(`\\b(?:${['gh', 'p'].join('')}|${['gh', 'o'].join('')}|${['gh', 's'].join('')}|${['github', '_pat'].join('')})_[A-Za-z0-9_]{6,}`), new RegExp(`-----BEGIN [A-Z ]*${['PRIVATE', ' KEY'].join('')}-----`), new RegExp(`\\b${['AK', 'IA'].join('')}[0-9A-Z]{16}\\b`)];
  for (const file of await allFiles()) {
    const text = await read(file);
    for (const shape of shapes) assert.doesNotMatch(text, shape, file);
    assert.ok(!text.includes(['gh', 'p_'].join('')), file);
  }
});

test('LICENSE: MIT with the copyright line of INNERLUXES and no year', async () => {
  const license = await read('LICENSE');
  assert.ok(license.startsWith('MIT License\n\nCopyright (c) INNERLUXES\n'));
});

test('SECURITY.md: how to report, and no promise about reply times or fixes', async () => {
  const text = await read('SECURITY.md');
  assert.match(text, /info@innerluxes\.dev/);
  assert.match(text, /"fsma-204-record-check security"/);
  assert.doesNotMatch(text, /within\s+\d|business days|within a (?:day|week)|\d+\s*(?:hours|days)\b|we will|we guarantee|guaranteed|respond within|reply within/i);
});

test('workflows: every action is pinned to a commit, the CI runs three systems, two Node versions and coverage, and the SSDF gate is there', async () => {
  for (const name of ['ci.yml', 'codeql.yml', 'release.yml']) {
    const text = await read(`.github/workflows/${name}`);
    assert.match(text, /^permissions:\n {2}contents: read$/m, name);
    const uses = [...text.matchAll(/^\s*- uses: (\S+)/gm)].map((m) => m[1]);
    assert.ok(uses.length > 0, name);
    for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, `${name}: ${u}`);
    assert.doesNotMatch(text, /epcis|marketplace|escrow|nft-|token-transfer|payout-batch|crypto-checkout|tokenomics/i, name);
  }
  const ci = await read('.github/workflows/ci.yml');
  assert.match(ci, /os: \[ubuntu-latest, windows-latest, macos-latest\]/);
  assert.match(ci, /node: \[22, 24\]/);
  assert.match(ci, /run: npm run test:coverage/);
  assert.match(ci, /node \.ssdf\/bin\/ssdf-repo-check\.js repo --require-all --fail-on-problem/);
  assert.match(ci, /repository: INNERLUXES\/ssdf-repo-check/);
  assert.match(ci, /ref: dfda194a3ed35623b8b420df05e110b66d984586 # v1\.0\.0/);
  for (const s of [/npm ci/, /npm run check/, /npm run example/, /git diff --exit-code -- examples/]) assert.match(ci, s);
});

test('codeql: JavaScript only, with the security-extended queries, and the examples and saved copy left out', async () => {
  const codeql = await read('.github/workflows/codeql.yml');
  assert.match(codeql, /languages: javascript-typescript/);
  assert.doesNotMatch(codeql, /autobuild/i);
  assert.match(codeql, /security-extended/);
  assert.match(codeql, /paths-ignore:\n\s+- examples\n\s+- research/);
  const attributes = await read('.gitattributes');
  assert.match(attributes, /^examples\/\*\* linguist-documentation$/m);
  assert.match(attributes, /^examples\/\*\* linguist-detectable=false$/m);
  assert.match(attributes, /^research\/sources\/\*\* -text$/m);
  assert.doesNotMatch(await read('.github/dependabot.yml'), /package-ecosystem: (?:nuget|pip|maven)/);
});

test('release workflow: the SSDF gate, then a tgz, a CycloneDX SBOM, SHA256SUMS and a provenance attestation named for this package', async () => {
  const release = await read('.github/workflows/release.yml');
  assert.match(release, /node \.ssdf\/bin\/ssdf-repo-check\.js repo --require-all --fail-on-problem/);
  assert.match(release, /ref: dfda194a3ed35623b8b420df05e110b66d984586 # v1\.0\.0/);
  assert.ok(release.indexOf('ssdf-repo-check.js') < release.indexOf('npm pack'), 'the gate runs before the package is made');
  assert.match(release, /npm pack --pack-destination dist/);
  assert.match(release, /npm sbom --sbom-format cyclonedx > dist\/fsma-204-record-check\.cdx\.json/);
  assert.match(release, /sha256sum \* > SHA256SUMS/);
  assert.match(release, /actions\/attest-build-provenance@/);
  assert.match(release, /tags: \['v\*'\]/);
});

test('repository files: Dependabot for actions and npm, CODEOWNERS, a pull request template and the line-end rules', async () => {
  const dependabot = await read('.github/dependabot.yml');
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(await read('.github/CODEOWNERS'), /^\* @innerluxesdev$/m);
  assert.match(await read('.github/pull_request_template.md'), /Conventional Commits/);
  assert.match(await read('.gitattributes'), /^\* text=auto eol=lf$/m);
  assert.match(await read('.gitignore'), /^\*\.pem$/m);
  for (const file of await allFiles()) assert.doesNotMatch(file, /epcis/i, file);
});

test('docs/secure-defaults.md is long enough for the SSDF gate, and every document the README links to exists', async () => {
  assert.ok(norm(await read('docs/secure-defaults.md')).length > 4000);
  const readme = await read('README.md');
  const files = await allFiles();
  for (const link of readme.matchAll(/\]\(((?:docs|research|examples)\/[^)#]*)\)/g)) assert.ok(files.includes(link[1].replace(/\/$/, '')) || files.some((f) => f.startsWith(link[1])), link[1]);
  for (const d of DECISIONS) assert.ok(files.includes(d), d);
});

test('src never reaches the network, runs a program or reads a clock, and builds no regular expression from input', async () => {
  const banned = [/node:(?:net|http|https|http2|dgram|tls|dns|child_process|worker_threads|vm|cluster)/, /\bfetch\(/, /\bXMLHttpRequest\b/, /\beval\(/, /new Function\(/, /\bDate\b/, /Date\.now/, /Math\.random/, /process\.env/, /Intl\./, /parseFloat\(/, /performance\.now/, /hrtime/, /getTimezoneOffset/];
  for (const file of await filesOf('src')) {
    const text = await read(file);
    for (const b of banned) assert.doesNotMatch(text.replace(/^\s*\/\/.*$/gm, ''), b, `${file}: ${b}`);
    if (file !== 'src/text.js') assert.ok(!/new RegExp/.test(text), `${file} builds a regular expression`);
  }
  assert.ok((await read('src/size.js')).includes('toLocaleString'), 'grouped() fixes the locale in the call');
});

test('src is only written to standard output and standard error, never to the disk', async () => {
  for (const file of await filesOf('src')) {
    const text = await read(file);
    assert.doesNotMatch(text, /writeFile|appendFile|createWriteStream|mkdir|unlink|rmSync|rename\(/, file);
  }
});

test('the decimal reader, the calendar and the bounded file reader are the ones of the sibling tools, with their limits, and the reader of tables has no recursion', async () => {
  const secrets = await read('src/secrets.js');
  assert.match(secrets, /^\/\/ The tool never reads a seed or a key\. A file that holds one anyway/);
  assert.ok(secrets.includes("export const SECRET_KEYS = ['mnemonic', 'mnemonicphrase', 'seed', 'seedphrase', 'seedwords', 'phrase', 'recoveryphrase', 'secretphrase', 'words', 'entropy', 'privatekey', 'privkey', 'secretkey', 'secret', 'xprv', 'xpriv', 'wif', 'passphrase', 'password', 'masterkey'];"));
  assert.ok(secrets.includes('const HEX_KEY = /^(?:0x)?[0-9a-fA-F]{64}$/;'));
  const files = await read('src/files.js');
  assert.match(files, /O_NOFOLLOW/);
  assert.match(files, /s\.size > limits\.maxBytes/);
  assert.match(await read('src/decimal.js'), /> limits\.maxDigits/);
  const csv = await read('src/csv.js');
  for (const limit of ['maxRows', 'maxColumns', 'maxCells', 'maxCellLength']) assert.ok(csv.includes(`limits.${limit}`), limit);
  assert.equal((csv.match(/function readTable/g) ?? []).length, 1);
  assert.ok(!/readTable\(/.test(csv.slice(csv.indexOf('function readTable') + 20)), 'readTable does not call itself');
});

test('a guarded test never asserts a line of its own', async () => {
  const text = await read('test/files.test.js');
  for (const block of text.split(/\ntest\(/).filter((b) => b.includes("process.platform === 'win32'"))) assert.doesNotMatch(block, /\.line\b|lineOf\(/);
});

test('every test file builds its paths with resolve(), and no test writes a backslash, a bar or a quote into a file name', async () => {
  for (const file of (await filesOf('test')).filter((f) => f.endsWith('.js'))) {
    const text = await read(file);
    assert.doesNotMatch(text, /\bjoin\(\s*(?:dir|tmpdir|root)/, `${file} joins an absolute path`);
    assert.doesNotMatch(text, /['"`][A-Za-z0-9_]+\\\\[A-Za-z0-9_]+\.csv['"`]/, `${file} writes a backslash into a file name`);
    assert.doesNotMatch(text, /\{\s*'[^']*[|*?"<>][^']*\.csv':/, `${file} writes a character Windows refuses into a file name`);
  }
});

test('tools/check.mjs and tools/example.mjs exist, the year check and the list of plain words are those of the sibling tools with six words added, and the saved example outputs are all there', async () => {
  const files = await filesOf('examples/output');
  for (const f of ['bad.txt', 'good.txt', 'bad-explain.txt', 'bad.md', 'good.md', 'bad-explain.md', 'bad.json', 'good.json', 'bad.sarif', 'good.sarif', 'checks.txt', 'checks.json']) assert.ok(files.includes(`examples/output/${f}`), f);
  const check = await read('tools/check.mjs');
  assert.ok(check.includes('no problems'));
  assert.ok(check.includes(`const YEAR = ${YEAR.toString()};`), 'the year check is unchanged');
  assert.ok(check.includes("const BANNED_WORDS = [['har', 'ness'], ['del', 've'], ['lever', 'age'], ['seam', 'less'], ['rob', 'ust'], ['cutting', '-edge'], ['un', 'lock'], ['em', 'power'], ['ele', 'vate'], ['stream', 'line'], ['game', '-changer'], ['tap', 'estry'], ['re', 'alm'], ['further', 'more'], ['more', 'over'], ['in today', \"'s\"], ['trans', 'form']"), 'the list of plain words starts as the sibling tools have it');
  for (const extra of ["['compre', 'hensive']", "['tail', 'ored']", "['state-of-the', '-art']", "['revol', 'ution']", "['holi', 'stic']", "['world', '-class']"]) assert.ok(check.includes(extra), extra);
  assert.ok((await read('tools/example.mjs')).includes('examples/output'));
});

test('the docs name every check id and every option of the command line', async () => {
  const method = await read('docs/method.md');
  for (const r of RULES) assert.ok(method.includes(`\`${r.id}\``), `docs/method.md: ${r.id}`);
  const inputs = await read('docs/inputs.md');
  for (const option of ['--format', '--json', '--min-severity', '--fail-on', '--now', '--explain', '--list-checks']) assert.ok(inputs.includes(option), option);
  const changelog = await read('CHANGELOG.md');
  for (const r of RULES) assert.ok(changelog.includes(`\`${r.id}\``), `CHANGELOG.md: ${r.id}`);
});
