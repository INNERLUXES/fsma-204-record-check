import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEST, COLUMNS, COLUMN_NAMES, ELEMENTS, EVENT_TYPES, NOT_A, NOTICE, POINTS, RULES, SOURCES, editDistance, flat, grouped, listText, nearest, normalizeName, plural, pointPage, safeText, source } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (rel) => readFile(resolve(root, rel), 'utf8');
const norm = (t) => t.replace(/\s+/g, ' ');

test('the one source has the official address of eCFR, and no number that reads like a year', () => {
  assert.equal(SOURCES.length, 1);
  const [s] = SOURCES;
  assert.equal(s.url, 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S');
  assert.doesNotMatch(s.url, /\b(?:19|20)\d{2}\b/);
  assert.equal(s.id, 'cfr');
  assert.equal(NOTICE, `This report is an input to a review of traceability records against 21 CFR Part 1 Subpart S: ${NOT_A}.`);
  assert.match(NOT_A, /^not legal advice and not an FDA certification/);
});

test('the source has a text copy under research/sources that starts with its address, and research/sources.md lists it', async () => {
  const notes = await read('research/sources.md');
  const [s] = SOURCES;
  const copy = await read(s.file);
  assert.ok(copy.startsWith(`Source: ${s.url}\n`), s.file);
  assert.ok(copy.length > 20000, 'the copy holds the nine sections');
  assert.ok(notes.includes(s.url));
  assert.ok(notes.includes(s.file));
});

test('the copy holds each section whole: the heading of every section the checks rest on', async () => {
  const copy = await read(SOURCES[0].file);
  for (const n of ['1.1310', '1.1320', '1.1325', '1.1330', '1.1335', '1.1340', '1.1345', '1.1350', '1.1455']) assert.ok(copy.includes(`\nSec. ${n} `), n);
  assert.ok([...copy].every((c) => c.charCodeAt(0) < 128), 'plain ASCII');
});

test('every point belongs to the listed source, names the section it comes from, and is not a long quotation of it', async () => {
  const copy = norm(await read(SOURCES[0].file));
  for (const [id, p] of Object.entries(POINTS)) {
    assert.equal(source(p.source), SOURCES[0], id);
    assert.equal(pointPage(id), SOURCES[0]);
    assert.ok(p.text.length > 40 && p.text.length < 420, id);
    assert.match(p.text, /\.$/, id);
    assert.match(p.section, /^1\.1\d{3}/, id);
    // The section named is one of the sections the copy holds.
    assert.ok(copy.includes(`Sec. ${p.section.slice(0, 6)} `), `${id}: ${p.section}`);
    // No run of 12 words of the point appears word for word in the rule.
    const words = norm(p.text).split(' ');
    for (let i = 0; i + 12 <= words.length; i += 1) assert.ok(!copy.includes(words.slice(i, i + 12).join(' ')), `${id} quotes the rule`);
  }
});

test('every point is used by a check, and every basis of a check is a point', () => {
  const used = new Set(RULES.flatMap((r) => r.basis));
  for (const id of Object.keys(POINTS)) assert.ok(used.has(id), `${id} is not used by a check`);
  for (const id of used) assert.ok(Object.hasOwn(POINTS, id), `${id} is not a point`);
});

test('docs/rules-and-sources.md lists the source with its copy and every check with its level, kind, points and what it cannot see', async () => {
  const doc = await read('docs/rules-and-sources.md');
  assert.ok(doc.includes(SOURCES[0].url) && doc.includes(SOURCES[0].file));
  for (const r of RULES) {
    const section = doc.split(/^## /m).find((p) => p.startsWith(`${r.id}\n`));
    assert.ok(section, r.id);
    assert.ok(section.includes(`- Level: ${r.severity}`), r.id);
    assert.ok(section.includes(`- Kind: ${r.kind}`), r.id);
    assert.ok(section.includes('- Cannot see: '), r.id);
    for (const b of r.basis) assert.ok(section.includes(POINTS[b].text), `${r.id}: ${b}`);
    if (r.kind === 'best practice') assert.ok(norm(section).includes(BEST), r.id);
    if (r.own) assert.ok(section.includes(r.own), `${r.id}: its own choice`);
  }
});

test('the documented checks name the rule and say no own choice, the best practice checks say what is their own choice, and the input checks rest on no section', () => {
  for (const r of RULES.filter((x) => x.kind === 'documented')) {
    assert.ok(r.basis.length > 0, r.id);
    assert.equal(r.own, undefined, r.id);
  }
  for (const r of RULES.filter((x) => x.kind === 'best practice')) assert.ok(r.own && r.own.includes(BEST), `${r.id} says what is its own choice`);
  for (const r of RULES.filter((x) => x.kind === 'input')) assert.deepEqual(r.basis, [], r.id);
  for (const r of RULES) assert.ok(r.fix.length > 20 && r.summary.length > 20, r.id);
});

test('the rule says what the documented checks rest on', async () => {
  const cfr = norm(await read(SOURCES[0].file));
  for (const s of [
    'Critical tracking event means an event in the supply chain of a food involving the harvesting, cooling (before initial packing), initial packing of a raw agricultural commodity other than a food obtained from a fishing vessel, first land-based receiving of a food obtained from a fishing vessel, shipping, receiving, or ' + 'trans' + 'formation of the food.',
    'Key data element means information associated with a critical tracking event for which a record must be maintained and/or provided',
    'Location description means key contact information for the location where a food is handled, specifically the business name, phone number, physical location address (or geographic coordinates), and city, State, and zip code for domestic locations',
    'Traceability lot code means a descriptor, often alphanumeric, used to uniquely identify a traceability lot within the records of the traceability lot code source.',
    'You must assign a traceability lot code when you do any of the following: Initially pack a raw agricultural commodity other than a food obtained from a fishing vessel; perform the first land-based receiving of a food obtained from a fishing vessel; or ' + 'trans' + 'form a food.',
    'you must not establish a new traceability lot code when you conduct other activities (e.g., shipping) for a food on the Food Traceability List.',
    'The quantity and unit of measure of the food (e.g., 75 bins, 200 pounds);',
    'The reference document type and reference document number.',
    'you must provide such information in an electronic sortable spreadsheet'
  ]) assert.ok(cfr.includes(s), s);
});

test('the elements of each kind of event are in the text of their section, one by one', async () => {
  const cfr = norm(await read(SOURCES[0].file));
  // Each section is the text between its heading and the next.
  const at = (n) => cfr.indexOf(`Sec. ${n} `);
  const sectionText = (n, next) => cfr.slice(at(n), at(next));
  const text = { '1.1325': sectionText('1.1325', '1.1330'), '1.1330': sectionText('1.1330', '1.1335'), '1.1335': sectionText('1.1335', '1.1340'), '1.1340': sectionText('1.1340', '1.1345'), '1.1345': sectionText('1.1345', '1.1350'), '1.1350': sectionText('1.1350', '1.1455') };
  const phrases = {
    'the commodity': 'The commodity and, if applicable, variety',
    'the quantity and unit of measure': 'quantity and unit of measure',
    'the location description for the immediate subsequent recipient': 'The location description for the immediate subsequent recipient',
    'the location description for the farm': 'The location description for the farm',
    'the date of harvesting': 'The date of harvesting',
    'the reference document type': 'reference document type and reference document number',
    'the reference document number': 'reference document type and reference document number',
    'the traceability lot code': 'The traceability lot code',
    'the product description': 'The product description',
    'the date the food was shipped': 'The date you shipped the food',
    'the date the food was received': 'The date you received the food',
    'the date of cooling': 'The date of cooling',
    'the date of initial packing': 'The date of initial packing',
    'the date the food was landed': 'The date the food was landed',
    'the date the new product was completed': 'The date ' + 'trans' + 'formation was completed'
  };
  for (const type of EVENT_TYPES) {
    const rec = { has: () => false, hasAny: () => true };
    const whole = text[type.section.slice(0, 6)];
    assert.ok(whole, type.id);
    for (const el of ELEMENTS[type.id](rec)) {
      const key = Object.keys(phrases).find((k) => el.label.startsWith(k) && k.length > 0 && (el.label === k || el.label.startsWith(`${k} `) || el.label.startsWith(`${k},`)));
      if (key) assert.ok(whole.includes(phrases[key]), `${type.id}: ${el.label} (${el.section})`);
    }
  }
  // The paragraph numbers are the ones the rule has: the section lists these many numbered elements.
  assert.ok(text['1.1340'].includes('(8) The reference document type'), 'shipping has eight elements');
  assert.ok(!text['1.1340'].includes('(9) '), 'and no ninth');
  assert.ok(text['1.1345'].includes('(8) The reference document type'));
  assert.ok(text['1.1330'].includes('(16) The reference document type'));
  assert.ok(text['1.1335'].includes('(g) The reference document type'));
  assert.ok(text['1.1325'].includes('(viii) The reference document type') && text['1.1325'].includes('(vii) The reference document type'));
});

test('the columns: one name for each, in the form the tool reads, each with a summary, and every column is used by an element or a check', () => {
  assert.equal(COLUMNS.length, 31);
  assert.deepEqual(COLUMNS.map((c) => c.name), COLUMN_NAMES);
  assert.equal(new Set(COLUMN_NAMES).size, COLUMN_NAMES.length);
  for (const c of COLUMNS) {
    assert.equal(normalizeName(c.name), c.name);
    assert.ok(c.summary.length > 15, c.name);
  }
  const used = new Set();
  const rec = { has: () => false, hasAny: () => true };
  for (const t of EVENT_TYPES) for (const el of ELEMENTS[t.id](rec)) for (const c of el.cols) used.add(c);
  for (const el of ELEMENTS.initial_packing({ has: (c) => c === 'previous_source_location' })) for (const c of el.cols) used.add(c);
  for (const c of ['event_type', 'variety', 'cooling_location', 'cooling_date', 'tlc_source_reference', 'previous_source_location', 'farm_location', 'receipt_date', 'harvest_date']) used.add(c);
  for (const c of COLUMN_NAMES) assert.ok(used.has(c), `${c} is read by no element`);
});

test('normalizeName and nearest: case and separators are ignored, and a name within two edits is suggested', () => {
  assert.equal(normalizeName(' Traceability Lot-Code '), 'traceability_lot_code');
  assert.equal(normalizeName('__x__y__'), 'x_y');
  assert.equal(normalizeName('A.B/C'), 'a_b_c');
  assert.equal(normalizeName(''), '');
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.equal(editDistance('', 'abc'), 3);
  assert.equal(nearest('shiping', ['shipping', 'receiving']), 'shipping');
  assert.equal(nearest('quantiy', COLUMN_NAMES), 'quantity');
  assert.equal(nearest('zzzzzz', COLUMN_NAMES), null);
  assert.equal(nearest('ab', ['abcdef']), null);
});

test('the helpers: grouped numbers, lists for a sentence, plurals, cleaned text', () => {
  assert.equal(grouped(1234567), '1,234,567');
  assert.equal(listText(['a']), 'a');
  assert.equal(listText(['a', 'b']), 'a and b');
  assert.equal(listText(['a', 'b', 'c']), 'a, b and c');
  assert.equal(listText(['a', 'b', 'c', 'd', 'e'], 3), 'a, b, c and 2 more');
  assert.equal(plural(1, 'row'), '1 row');
  assert.equal(plural(2, 'class', 'classes'), '2 classes');
  assert.equal(plural(1000, 'byte'), '1,000 bytes');
  assert.equal(flat(' a \n b\t c '), 'a b c');
  assert.equal(safeText(`a${String.fromCharCode(0)}b${String.fromCharCode(0x202e)}c`, 10), 'a b c');
  assert.equal(safeText('x'.repeat(20), 10), 'xxxxxxx...');
});
