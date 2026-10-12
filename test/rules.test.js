import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLUMN_NAMES, ELEMENTS, EVENT_TYPES, FINDING_CAP, PLACEHOLDERS, RULES, buildReport, checkText } from '../src/index.js';
import { NOW, clean, cooling, findingsOf, harvesting, idsOf, landing, lineOf, making, ofCheck, packing, packingExempt, receiving, shipping, table } from './helpers.js';

const without = (o, ...columns) => {
  const out = { ...o };
  for (const c of columns) delete out[c];
  return out;
};

test('a clean table passes every check at every level, with and without --now', () => {
  assert.deepEqual(findingsOf(clean(), { now: NOW }), []);
  assert.deepEqual(findingsOf(clean()), []);
  const r = checkText(table(clean()), { now: NOW });
  assert.equal(r.analysis.summary.rows, 8);
  assert.equal(r.analysis.summary.skipped, 0);
});

test('there are twenty-one checks: six about the file, seven documented by a section of the rule, eight best practices', () => {
  assert.equal(RULES.length, 21);
  assert.equal(RULES.filter((r) => r.kind === 'input').length, 6);
  assert.equal(RULES.filter((r) => r.kind === 'documented').length, 7);
  assert.equal(RULES.filter((r) => r.kind === 'best practice').length, 8);
  assert.equal(new Set(RULES.map((r) => r.id)).size, 21);
});

// ---- the kind of event ----

test('event-type-unknown: a word that is none of the seven kinds, an empty cell and a placeholder, with the nearest kind named', () => {
  const [f] = ofCheck([shipping({ event_type: 'Shiping' })], 'event-type-unknown');
  assert.match(f.message, /^The event_type of row 1, "Shiping", is not one of the seven critical tracking events of 21 CFR 1\.1310\. Did you mean shipping\? Its elements were not checked\.$/);
  assert.equal(f.line, 2);
  assert.equal(f.column, 1);
  assert.match(ofCheck([shipping({ event_type: 'carrying cheese' })], 'event-type-unknown')[0].message, /"carrying cheese", is not one of the seven critical tracking events of 21 CFR 1\.1310\. Its elements/);
  for (const empty of ['', '  ', 'n/a']) assert.match(ofCheck([shipping({ event_type: empty })], 'event-type-unknown')[0].message, /^Row 1 has no event_type, so the kind of critical tracking event is not known/, JSON.stringify(empty));
  assert.deepEqual(idsOf([shipping({ event_type: 'carrying cheese', traceability_lot_code: '', quantity: '', unit_of_measure: '' })]), ['event-type-unknown'], 'the elements of an unknown kind are not checked');
});

test('event-type-unknown: the seven kinds are read in any case with any separator, and nothing else is', () => {
  const kinds = { harvesting: harvesting(), cooling: cooling(), initial_packing: packing(), first_land_based_receiving: landing(), shipping: shipping(), receiving: receiving(), 'transformation': making() };
  assert.deepEqual(EVENT_TYPES.map((t) => t.id), Object.keys(kinds));
  for (const [id, base] of Object.entries(kinds)) {
    for (const spelling of [id, id.toUpperCase(), id.replace(/_/g, ' '), id.replace(/_/g, '-'), ` ${id} `, id.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())]) {
      assert.deepEqual(idsOf([{ ...base, event_type: spelling }]).filter((i) => i === 'event-type-unknown'), [], `${id} as ${JSON.stringify(spelling)}`);
    }
  }
  for (const word of ['harvest', 'pack', ['trans', 'form'].join(''), 'initial', 'ship', 'receive', 'landing']) assert.deepEqual(idsOf([shipping({ event_type: word })]), ['event-type-unknown'], word);
  for (const word of ['__proto__', 'constructor', 'toString']) assert.deepEqual(idsOf([shipping({ event_type: word })]), ['event-type-unknown'], word);
});

// ---- key data elements ----

const EXAMPLE = { harvesting: harvesting(), cooling: cooling(), initial_packing: packing(), initial_packing_exempt: packingExempt(), first_land_based_receiving: landing(), shipping: shipping(), receiving: receiving(), 'transformation': making() };

// The paragraphs of the rule, as the sections of the elements the tool holds for each kind of event.
const SECTIONS = {
  harvesting: ['1.1325(a)(1)(i)', '1.1325(a)(1)(ii)', '1.1325(a)(1)(iii)', '1.1325(a)(1)(iv)', '1.1325(a)(1)(v) and (vi)', '1.1325(a)(1)(vii)', '1.1325(a)(1)(viii)'],
  cooling: ['1.1325(b)(1)(i)', '1.1325(b)(1)(ii)', '1.1325(b)(1)(iii)', '1.1325(b)(1)(iv)', '1.1325(b)(1)(v)', '1.1325(b)(1)(vi)', '1.1325(b)(1)(vii)'],
  initial_packing: ['1.1330(a)(1)', '1.1330(a)(2)', '1.1330(a)(3)', '1.1330(a)(4)', '1.1330(a)(5) and (6)', '1.1330(a)(7)', '1.1330(a)(8)', '1.1330(a)(11)', '1.1330(a)(12)', '1.1330(a)(13)', '1.1330(a)(14)', '1.1330(a)(15)', '1.1330(a)(16)'],
  initial_packing_exempt: ['1.1330(c)(1)', '1.1330(c)(2)', '1.1330(c)(3)', '1.1330(c)(5)', '1.1330(c)(6)', '1.1330(c)(7)', '1.1330(c)(8)', '1.1330(c)(9)', '1.1330(c)(10)'],
  first_land_based_receiving: ['1.1335(a)', '1.1335(b)', '1.1335(c)', '1.1335(d)', '1.1335(e)', '1.1335(f)', '1.1335(g)'],
  shipping: ['1.1340(a)(1)', '1.1340(a)(2)', '1.1340(a)(3)', '1.1340(a)(4)', '1.1340(a)(5)', '1.1340(a)(6)', '1.1340(a)(7)', '1.1340(a)(8)'],
  receiving: ['1.1345(a)(1)', '1.1345(a)(2)', '1.1345(a)(3)', '1.1345(a)(4)', '1.1345(a)(5)', '1.1345(a)(6)', '1.1345(a)(7)', '1.1345(a)(8)'],
  'transformation': ['1.1350(a)(2)(i)', '1.1350(a)(2)(ii)', '1.1350(a)(2)(iii)', '1.1350(a)(2)(iv)', '1.1350(a)(2)(v)', '1.1350(a)(2)(vi)', '1.1350(a)(1)(i)', '1.1350(a)(1)(ii)', '1.1350(a)(1)(iii)']
};

// A stand-in for a row, which says whether it names a previous source (for the shorter list of initial packing from a
// person the subpart does not cover) and that it names an input (for making a new product).
const recFor = (name) => ({ has: (c) => name === 'initial_packing_exempt' && c === 'previous_source_location', hasAny: () => true });

test('the elements held for each kind of event are the paragraphs the section lists', () => {
  for (const [name, base] of Object.entries(EXAMPLE)) {
    const type = EVENT_TYPES.find((t) => t.id === base.event_type);
    assert.deepEqual([...new Set(ELEMENTS[type.id](recFor(name)).map((e) => e.section))], SECTIONS[name], name);
  }
});

test('kde-missing: each element of each kind of event is reported when its cells are empty, at its cell, naming its paragraph, and not when it is filled', () => {
  for (const [name, base] of Object.entries(EXAMPLE)) {
    const type = EVENT_TYPES.find((t) => t.id === base.event_type);
    const elements = ELEMENTS[type.id](recFor(name));
    const KDE = ['kde-missing', 'kde-conditional-missing', 'quantity-unit-missing', 'date-invalid', 'quantity-not-positive'];
    assert.deepEqual(idsOf([base]).filter((i) => KDE.includes(i)), [], `${name} passes as it is`);
    for (const el of elements) {
      const broken = without(base, ...el.cols);
      const found = findingsOf([broken]).filter((f) => f.id === 'kde-missing' || f.id === 'kde-conditional-missing');
      const mine = found.filter((f) => f.message.includes(`21 CFR ${el.section} lists`));
      assert.equal(mine.length, 1, `${name} ${el.section}: ${el.label}`);
      assert.equal(mine[0].id, el.conditional ? 'kde-conditional-missing' : 'kde-missing');
      assert.equal(mine[0].line, 2);
      assert.match(mine[0].message, new RegExp(`^Row 1 \\(${type.label}\\) has no `));
      // The other elements, and only this one, stay silent unless they share a cell.
      assert.ok(found.length >= 1);
    }
  }
});

test('kde-missing: the message names the element and the cell, and an element with two cells is given by either one', () => {
  const [f] = ofCheck([shipping({ event_location: '' })], 'kde-missing');
  assert.equal(f.message, 'Row 1 (shipping) has no location description for the location from which the food was shipped, which 21 CFR 1.1340(a)(5) lists; the cell under "event_location" is empty.');
  assert.equal(f.subject, 'LOT-A1');
  const line = table([shipping({ event_location: '' })]).split('\n')[1];
  assert.equal(line[f.column - 1], ',', 'the empty cell starts where its comma is, right after the cell before it');
  assert.deepEqual(ofCheck([shipping({ tlc_source_reference: 'FFR-123' })], 'kde-missing'), [], 'a reference is not needed when the location is given');
  assert.deepEqual(ofCheck([shipping({ tlc_source_location: '', tlc_source_reference: 'FFR-123' })], 'kde-missing'), [], 'and the location is not needed when the reference is');
  const both = ofCheck([shipping({ tlc_source_location: '', tlc_source_reference: '' })], 'kde-missing');
  assert.equal(both.length, 1);
  assert.match(both[0].message, /the traceability lot code source, or the traceability lot code source reference, which 21 CFR 1\.1340\(a\)\(7\) lists; the cells under "tlc_source_location" and "tlc_source_reference" are empty\.$/);
  assert.equal(ofCheck([landing({ species: '' })], 'kde-missing').length, 1, 'with neither the species nor a product description the element is missing');
  assert.deepEqual(ofCheck([landing({ species: '', product_description: 'Cod fillets, 5 lb box' })], 'kde-missing'), []);
  assert.equal(ofCheck([landing({ species: '', product_description: '' }), landing({ species: 'Cod', event_date: '2101-03-02' })], 'kde-missing').length, 1);
});

test('kde-missing: n/a and the other placeholders count as empty, a real value that starts like one does not', () => {
  assert.deepEqual(PLACEHOLDERS, ['n/a', 'na', 'none', 'null', 'nil', 'tbd', 'unknown', '-', '--', '?']);
  for (const p of PLACEHOLDERS) {
    for (const spelling of [p, p.toUpperCase(), ` ${p} `]) {
      const [f] = ofCheck([shipping({ product_description: spelling })], 'kde-missing');
      assert.ok(f, JSON.stringify(spelling));
      assert.match(f.message, new RegExp(`holds the placeholder "${spelling.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i'), JSON.stringify(spelling));
    }
  }
  for (const real of ['Nancy', 'None of the above beans', 'n/a beans', '-1', 'Unknown Farm Spinach', 'na2']) assert.deepEqual(ofCheck([shipping({ product_description: real })], 'kde-missing'), [], real);
  assert.equal(ofCheck([shipping({ product_description: '   ' })], 'kde-missing').length, 1, 'white space alone is empty');
});

test('kde-missing: the kind of initial packing follows the sender: a previous source and no farm is the shorter list of 1.1330(c)', () => {
  const exempt = ofCheck([packingExempt({ commodity: '' })], 'kde-missing')[0];
  assert.match(exempt.message, /which 21 CFR 1\.1330\(c\)\(1\) lists/);
  assert.deepEqual(ofCheck([packingExempt()], 'kde-missing'), [], 'no farm and no harvester are needed');
  const both = ofCheck([packingExempt({ farm_location: FARM_TEXT })], 'kde-missing').map((f) => f.message.match(/1\.1330\(a\)\(\d+\)/)?.[0]);
  assert.ok(both.includes('1.1330(a)(7)') && both.includes('1.1330(a)(8)'), 'with a farm named the longer list of 1.1330(a) applies: the harvester and the harvest date are asked for');
  const neither = ofCheck([packing({ farm_location: '', previous_source_location: '' })], 'kde-missing').map((f) => f.message.match(/1\.1330\(a\)\(\d+\)/)?.[0]);
  assert.ok(neither.includes('1.1330(a)(4)'), 'neither a farm nor a previous source: the longer list asks for the farm');
});
const FARM_TEXT = 'Green Valley Farm, 555-0111, 12 Orchard Road, Springfield, ST 00001';

test('kde-conditional-missing: the growing area is a warning, not an error, and is asked for in harvesting and in initial packing from a farm', () => {
  for (const base of [harvesting(), packing()]) {
    const [f] = ofCheck([{ ...base, growing_area: '' }], 'kde-conditional-missing');
    assert.match(f.message, /has no field or other growing area \(produce\), or the container \(aquacultured food\), which 21 CFR 1\.\d+\(a\)\(\d\)(?:\(v\))? and \(vi\) lists; the cell under "growing_area" is empty\.$|which 21 CFR 1\.1330\(a\)\(5\) and \(6\) lists/);
    assert.equal(ofCheck([{ ...base, growing_area: '' }], 'kde-missing').length, 0);
  }
  assert.deepEqual(ofCheck([packingExempt()], 'kde-conditional-missing'), []);
});

test('making a new product: the inputs are asked for when a row names one, and not when it names none', () => {
  assert.deepEqual(idsOf([making({ input_traceability_lot_code: '', input_product_description: '', input_quantity: '', input_unit_of_measure: '' })]), [], 'a new product with no input on the list');
  const ids = (over) => ofCheck([packingExempt(), making(over)], 'kde-missing').map((f) => f.message.match(/1\.1350\(a\)\(1\)\([a-z]+\)/)?.[0]);
  assert.deepEqual(ids({ input_traceability_lot_code: '' }), ['1.1350(a)(1)(i)']);
  assert.deepEqual(ids({ input_product_description: '' }), ['1.1350(a)(1)(ii)']);
  assert.deepEqual(ids({ input_quantity: '', input_unit_of_measure: '' }), ['1.1350(a)(1)(iii)']);
  assert.deepEqual(ids({ input_traceability_lot_code: '', input_product_description: '', input_quantity: '', input_unit_of_measure: 'sacks' }), ['1.1350(a)(1)(i)', '1.1350(a)(1)(ii)'], 'a unit alone is a unit with no quantity (quantity-unit-missing), not a missing element');
});

test('column-missing: a column the rows need that is not in the header is reported once, at the header, and not for every row', () => {
  const columns = COLUMN_NAMES.filter((c) => c !== 'reference_document_number');
  const rows = [shipping(), shipping({ event_date: '2101-03-04' }), receiving()];
  const f = findingsOf(table(rows, columns));
  const missing = f.filter((x) => x.id === 'column-missing');
  assert.equal(missing.length, 1);
  assert.equal(missing[0].line, 1);
  assert.match(missing[0].message, /^The header has no "reference_document_number" column, but the rows of shipping and receiving need the reference document number \(21 CFR 1\.1340\(a\)\(8\)\); 3 rows are affected and none of them is reported for it one by one\.$/);
  assert.equal(f.filter((x) => x.id === 'kde-missing').length, 0);
  const pair = findingsOf(table([shipping()], COLUMN_NAMES.filter((c) => !['quantity', 'unit_of_measure'].includes(c)))).filter((x) => x.id === 'column-missing');
  assert.equal(pair.length, 1);
  assert.match(pair[0].message, /^The header has no "quantity" and "unit_of_measure" columns, but the rows of shipping need the quantity and unit of measure/);
  const either = findingsOf(table([shipping()], COLUMN_NAMES.filter((c) => !['tlc_source_location', 'tlc_source_reference'].includes(c)))).filter((x) => x.id === 'column-missing');
  assert.match(either[0].message, /no "tlc_source_location" or "tlc_source_reference" column/);
  assert.equal(findingsOf(table([shipping()], COLUMN_NAMES.filter((c) => c !== 'tlc_source_reference'))).filter((x) => x.id === 'column-missing').length, 0, 'one of the two is enough');
  assert.equal(findingsOf(table([harvesting()], COLUMN_NAMES.filter((c) => c !== 'harvester_contact'))).filter((x) => x.id === 'column-missing').length, 0, 'a column only another kind of event needs is not reported');
});

test('column-missing: an element that is only asked for where it applies is a note, not an error', () => {
  const r = checkText(table([harvesting()], COLUMN_NAMES.filter((c) => c !== 'growing_area')));
  assert.deepEqual(r.findings, []);
  assert.ok(r.notes.includes('the file has no "growing_area" column, so the field or other growing area (produce), or the container (aquacultured food) (21 CFR 1.1325(a)(1)(v) and (vi)) was not checked in 1 row'));
});

// ---- lot codes ----

test('lot-code-at-harvest-or-cooling: a lot code on a harvesting or a cooling row is reported, and not on any other kind', () => {
  for (const base of [harvesting(), cooling()]) {
    const [f] = ofCheck([{ ...base, traceability_lot_code: 'LOT-H1' }], 'lot-code-at-harvest-or-cooling');
    assert.match(f.message, /^Row 1 \((?:harvesting|cooling)\) holds the lot code LOT-H1, but 21 CFR 1\.1320 assigns a traceability lot code at initial packing/);
    assert.equal(f.subject, 'LOT-H1');
    assert.deepEqual(ofCheck([{ ...base, traceability_lot_code: 'n/a' }], 'lot-code-at-harvest-or-cooling'), [], 'a placeholder is no lot code');
    assert.deepEqual(ofCheck([base], 'lot-code-at-harvest-or-cooling'), []);
  }
  for (const other of [packing(), shipping(), receiving(), making(), landing()]) assert.deepEqual(ofCheck([packingExempt(), other], 'lot-code-at-harvest-or-cooling'), []);
});

test('lot-code-new-at-shipping: a shipping row that is its own lot code source with no row that assigns the lot, and nothing near it', () => {
  const [f] = ofCheck([shipping({ traceability_lot_code: 'LOT-Z9' })], 'lot-code-new-at-shipping');
  assert.match(f.message, /^Row 1 \(shipping\) names the place it ships from as the source of the lot code LOT-Z9, but no row of the file assigns that lot code, and 21 CFR 1\.1320\(b\) says not to establish a new lot code when shipping\.$/);
  assert.equal(f.line, 2);
  const assigned = (other) => ofCheck([other, shipping({ traceability_lot_code: 'LOT-Z9' })], 'lot-code-new-at-shipping');
  assert.deepEqual(assigned(packing({ traceability_lot_code: 'LOT-Z9' })), [], 'initial packing assigns it');
  assert.deepEqual(assigned(landing({ traceability_lot_code: 'LOT-Z9' })), [], 'first land-based receiving assigns it');
  assert.deepEqual(assigned(making({ traceability_lot_code: 'LOT-Z9' })), [], 'making a new product assigns it');
  assert.deepEqual(assigned(receiving({ traceability_lot_code: 'LOT-Z9' })), [], 'a receipt brings it in');
  assert.equal(assigned(harvesting({ traceability_lot_code: 'LOT-Z9' })).length, 1, 'a harvest does not assign one');
  assert.equal(assigned(shipping({ traceability_lot_code: 'LOT-Z9', event_date: '2101-03-09' })).length, 2, 'another shipment does not either');
  assert.deepEqual(ofCheck([shipping({ traceability_lot_code: 'LOT-Z9', tlc_source_location: DEPOT_TEXT })], 'lot-code-new-at-shipping'), [], 'the lot code source is another place');
  assert.deepEqual(ofCheck([shipping({ traceability_lot_code: 'LOT-Z9', tlc_source_location: '', tlc_source_reference: 'FFR-1' })], 'lot-code-new-at-shipping'), [], 'a reference only: the source is not known to be this place');
  assert.deepEqual(ofCheck([shipping({ traceability_lot_code: 'LOT-Z9', event_location: '' })], 'lot-code-new-at-shipping'), []);
  assert.equal(ofCheck([shipping({ traceability_lot_code: 'LOT-Z9', tlc_source_location: PACKER_TEXT.toUpperCase().replace(/  +/g, ' ') })], 'lot-code-new-at-shipping').length, 1, 'case and spacing do not matter');
});
const DEPOT_TEXT = 'Example Distribution Center, 555-0133, 7 Freight Way, Rivertown, ST 00003';
const PACKER_TEXT = 'Sample Packing House, 555-0122, 40 Cold Storage Lane, Springfield, ST 00002';

// ---- dates ----

test('date-invalid: a date that does not exist, is not a date or is written the American way, in every date column', () => {
  for (const column of ['event_date', 'receipt_date', 'harvest_date', 'cooling_date']) {
    const [f] = ofCheck([packing({ [column]: '2101-02-30' })], 'date-invalid');
    assert.match(f.message, new RegExp(`^The ${column} of row 1 \\(initial packing\\), "2101-02-30", has the day 30, but month 02 of 2101 has 28 days\\.$`), column);
    assert.equal(f.subject, 'LOT-A1');
  }
  assert.match(ofCheck([shipping({ event_date: '03/04/2101' })], 'date-invalid')[0].message, /written like a date of the United States/);
  assert.match(ofCheck([shipping({ event_date: 'last Tuesday' })], 'date-invalid')[0].message, /is not a date written YYYY-MM-DD/);
  assert.match(ofCheck([shipping({ event_date: '2101-03-04T10:00:00' })], 'date-invalid')[0].message, /has no time zone/);
  for (const ok of ['2101-03-04', '2101-02-28', '2101-03-04T10:00:00Z', '2101-03-04T10:00:00+01:00', ' 2101-03-04 ']) assert.deepEqual(ofCheck([shipping({ event_date: ok })], 'date-invalid'), [], ok);
  assert.deepEqual(ofCheck([shipping({ event_date: '' })], 'date-invalid'), [], 'an empty date is a missing element, not an invalid date');
  assert.equal(ofCheck([shipping({ event_date: '' })], 'kde-missing').length, 1);
  assert.deepEqual(ofCheck([harvesting({ receipt_date: '2101-99-99' })], 'date-invalid').length, 1, 'a date in a column the kind of event does not ask for is still read');
});

test('future-date: a date after --now, with one day of room for a day alone; without --now the check does not run and says so', () => {
  const late = (d) => ofCheck([shipping({ event_date: d })], 'future-date', { now: NOW });
  assert.deepEqual(late('2101-03-10'), []);
  assert.deepEqual(late('2101-03-11'), [], 'one day after is allowed');
  const [f] = late('2101-03-12');
  assert.match(f.message, /^The event_date of row 1 \(shipping\), 2101-03-12, is after the moment given with --now\.$/);
  assert.deepEqual(late('2101-03-10T12:00:00Z'), []);
  assert.equal(late('2101-03-10T12:00:01Z').length, 1);
  assert.deepEqual(late('2101-03-10T13:00:00+01:00'), []);
  assert.deepEqual(ofCheck([shipping({ event_date: '2101-12-31' })], 'future-date'), [], 'no --now: nothing is compared');
  const r = checkText(table([shipping()]));
  assert.ok(r.notes.includes('no --now was given, so future-date did not run'));
  assert.ok(!checkText(table([shipping()]), { now: NOW }).notes.includes('no --now was given, so future-date did not run'));
  assert.equal(ofCheck([packing({ harvest_date: '2101-04-01', receipt_date: '2101-04-02', event_date: '2101-04-03' })], 'future-date', { now: NOW }).length, 3, 'every date column is compared');
});

test('dates-out-of-order: a date of a row that goes back before the one that comes earlier, once for each row', () => {
  const [f] = ofCheck([packing({ harvest_date: '2101-03-05', cooling_date: '', receipt_date: '2101-03-02' })], 'dates-out-of-order');
  assert.equal(f.message, 'The receipt_date of row 1 (initial packing), 2101-03-02, is before the harvest_date, 2101-03-05.');
  assert.equal(f.line, 2);
  assert.match(ofCheck([packing({ cooling_date: '2101-02-28' })], 'dates-out-of-order')[0].message, /^The cooling_date .* is before the harvest_date/);
  assert.match(ofCheck([packing({ event_date: '2101-03-01', receipt_date: '2101-03-02' })], 'dates-out-of-order')[0].message, /^The event_date .* is before the receipt_date/);
  assert.equal(ofCheck([packing({ harvest_date: '2101-03-09', cooling_date: '2101-03-01', receipt_date: '2101-03-01', event_date: '2101-03-01' })], 'dates-out-of-order').length, 1, 'one finding for a row');
  for (const ok of [{}, { cooling_date: '2101-03-02', receipt_date: '2101-03-02' }, { harvest_date: '2101-03-02', cooling_date: '', event_date: '2101-03-02' }]) assert.deepEqual(ofCheck([packing(ok)], 'dates-out-of-order'), [], JSON.stringify(ok));
  assert.deepEqual(ofCheck([packing({ harvest_date: '2101-02-30', receipt_date: '2101-03-01' })], 'dates-out-of-order'), [], 'a date that does not exist is left to date-invalid');
});

// ---- quantities ----

test('quantity-not-positive: zero, negative, separators, exponents and text are reported; plain positive numbers are not', () => {
  for (const bad of ['0', '0.00', '-5', '+5', '1,000', '1e3', 'abc', '5 kg', '.5', '05', '1/2', '1'.repeat(41)]) {
    const [f] = ofCheck([shipping({ quantity: bad })], 'quantity-not-positive');
    assert.ok(f, bad);
    assert.equal(f.line, 2);
  }
  assert.match(ofCheck([shipping({ quantity: '0' })], 'quantity-not-positive')[0].message, /^The quantity of row 1 \(shipping\) is zero; a quantity must be above zero\.$/);
  assert.match(ofCheck([shipping({ quantity: '5 kg' })], 'quantity-not-positive')[0].message, /^The quantity of row 1 \(shipping\), "5 kg", is not a plain number above zero/);
  for (const ok of ['1', '0.5', '25.5', '1000000', '0.0001', '1'.repeat(40)]) assert.deepEqual(ofCheck([shipping({ quantity: ok })], 'quantity-not-positive'), [], ok);
  assert.equal(ofCheck([packing({ received_quantity: '0' })], 'quantity-not-positive').length, 1, 'the received quantity too');
  assert.equal(ofCheck([packingExempt(), making({ input_quantity: '-1' })], 'quantity-not-positive').length, 1, 'and the quantity of an input');
  assert.deepEqual(ofCheck([shipping({ quantity: '' })], 'quantity-not-positive'), [], 'an empty quantity is a missing element');
});

test('quantity-unit-missing: a quantity with no unit and a unit with no quantity, for the three pairs, and not when both are given or both are empty', () => {
  const [f] = ofCheck([shipping({ unit_of_measure: '' })], 'quantity-unit-missing');
  assert.equal(f.message, 'The quantity of row 1 (shipping), 400, has no unit of measure in the unit_of_measure column.');
  assert.equal(f.line, 2);
  assert.match(ofCheck([shipping({ quantity: '' })], 'quantity-unit-missing')[0].message, /^The unit_of_measure of row 1 \(shipping\), "cases", has no quantity in the quantity column\.$/);
  assert.equal(ofCheck([packing({ received_unit_of_measure: '' })], 'quantity-unit-missing').length, 1);
  assert.equal(ofCheck([packingExempt(), making({ input_unit_of_measure: 'n/a' })], 'quantity-unit-missing').length, 1);
  assert.deepEqual(ofCheck([shipping({ quantity: '', unit_of_measure: '' })], 'quantity-unit-missing'), []);
  assert.equal(ofCheck([shipping({ quantity: '', unit_of_measure: '' })], 'kde-missing').length, 1, 'both empty is one missing element');
  assert.equal(ofCheck([shipping({ unit_of_measure: '' })], 'kde-missing').length, 0, 'one of the two is the finding of the pair, not of the element');
  assert.deepEqual(ofCheck([shipping()], 'quantity-unit-missing'), []);
});

// ---- across rows ----

test('receiving-without-shipping and shipping-without-receiving: notes for a lot code that is only on one side, and nothing for a lot on both', () => {
  const only = (rows, id) => ofCheck(rows, id);
  assert.equal(only([receiving()], 'receiving-without-shipping').length, 1);
  assert.match(only([receiving()], 'receiving-without-shipping')[0].message, /^Row 1 \(receiving\) receives the lot code LOT-A1, which no shipping row of the file ships\.$/);
  assert.equal(only([shipping()], 'shipping-without-receiving').length, 1);
  assert.match(only([shipping()], 'shipping-without-receiving')[0].message, /^Row 1 \(shipping\) ships the lot code LOT-A1, which no receiving row of the file receives\.$/);
  assert.deepEqual(only([shipping(), receiving()], 'receiving-without-shipping'), []);
  assert.deepEqual(only([shipping(), receiving()], 'shipping-without-receiving'), []);
  assert.equal(only([shipping(), receiving({ traceability_lot_code: 'LOT-A2' })], 'receiving-without-shipping').length, 1, 'another lot code is not a match');
  assert.equal(only([receiving(), receiving({ event_date: '2101-03-05' }), receiving({ event_date: '2101-03-06' })], 'receiving-without-shipping').length, 3, 'one note for each row');
  assert.deepEqual(only([shipping({ traceability_lot_code: '' }), receiving({ traceability_lot_code: 'n/a' })], 'shipping-without-receiving'), [], 'a row with no lot code has none to match');
  assert.equal(only([shipping(), receiving({ traceability_lot_code: 'lot-a1' })], 'receiving-without-shipping').length, 1, 'lot codes are compared as written');
  assert.equal(RULES.find((r) => r.id === 'receiving-without-shipping').severity, 'info');
  assert.equal(RULES.find((r) => r.id === 'shipping-without-receiving').severity, 'info');
});

test('received-more-than-shipped: receipts that add up to more than the shipments of the lot in the same unit, once, at the row that crosses', () => {
  const ship = (q, u = 'cases') => shipping({ quantity: q, unit_of_measure: u });
  const get = (q, d, u = 'cases') => receiving({ quantity: q, unit_of_measure: u, event_date: `2101-03-0${d}` });
  const [f] = ofCheck([ship('100'), get('130', 4)], 'received-more-than-shipped');
  assert.equal(f.message, 'By row 2 (receiving) the lot code LOT-A1 is received 130 cases in total, more than the 100 cases that the shipping rows of the file ship.');
  assert.equal(f.subject, 'LOT-A1');
  assert.equal(f.line, 3);
  assert.deepEqual(ofCheck([ship('100'), get('100', 4)], 'received-more-than-shipped'), [], 'exactly what was shipped');
  assert.deepEqual(ofCheck([ship('100'), get('60', 4), get('40', 5)], 'received-more-than-shipped'), [], 'receipts add up');
  const over = ofCheck([ship('100'), get('60', 4), get('41', 5), get('5', 6)], 'received-more-than-shipped');
  assert.equal(over.length, 1);
  assert.equal(over[0].line, 4, 'at the row where the total first passes the shipments');
  assert.deepEqual(ofCheck([ship('60'), ship('40'), get('100', 4)], 'received-more-than-shipped'), [], 'shipments add up');
  assert.equal(ofCheck([ship('60'), ship('40'), get('101', 4)], 'received-more-than-shipped').length, 1);
  assert.deepEqual(ofCheck([ship('0.1'), ship('0.2'), get('0.3', 4)], 'received-more-than-shipped'), [], 'decimals add up exactly: 0.1 and 0.2 are 0.3');
  assert.equal(ofCheck([ship('0.3'), get('0.1', 4), get('0.2000000000000001', 5)], 'received-more-than-shipped').length, 1, 'and a hair over is over');
  assert.deepEqual(ofCheck([ship('100', 'cases'), get('130', 4, 'kg')], 'received-more-than-shipped'), [], 'another unit of measure is not compared');
  assert.equal(ofCheck([ship('100', 'cases'), get('130', 4, ' CASES ')], 'received-more-than-shipped').length, 1, 'units are compared in any case');
  assert.deepEqual(ofCheck([get('130', 4)], 'received-more-than-shipped'), [], 'nothing shipped in the file: only a note');
  assert.equal(ofCheck([ship('100'), get('130', 4), receiving({ traceability_lot_code: 'LOT-A2', quantity: '5', event_date: '2101-03-05' })], 'received-more-than-shipped').length, 1, 'another lot code is its own lot');
  assert.equal(ofCheck([ship('100'), get('130', 4), get('10', 5, 'kg'), ship('1', 'kg'), get('3', 6, 'kg')], 'received-more-than-shipped').length, 2, 'once for each unit');
  assert.deepEqual(ofCheck([ship('100'), get('0', 4)], 'received-more-than-shipped'), [], 'a quantity that is not above zero is not added');
});

test('made-from-unknown-lot: an input lot code that no row holds, and not one that a row of any kind holds', () => {
  const [f] = ofCheck([making({ input_traceability_lot_code: 'LOT-X0' })], 'made-from-unknown-lot');
  assert.equal(f.message, 'Row 1 (making a new product) uses the input lot code LOT-X0, which no row of the file holds.');
  assert.equal(f.line, 2);
  for (const holder of [packingExempt(), packing({ traceability_lot_code: 'LOT-B7' }), landing({ traceability_lot_code: 'LOT-B7' }), receiving({ traceability_lot_code: 'LOT-B7' }), shipping({ traceability_lot_code: 'LOT-B7' })]) assert.deepEqual(ofCheck([holder, making()], 'made-from-unknown-lot'), [], holder.event_type);
  assert.equal(ofCheck([packingExempt({ traceability_lot_code: 'LOT-B8' }), making()], 'made-from-unknown-lot').length, 1);
  assert.deepEqual(ofCheck([making(), making({ traceability_lot_code: 'LOT-B7', input_traceability_lot_code: 'LOT-C3' })], 'made-from-unknown-lot'), [], 'a lot made earlier in the file is known');
  assert.deepEqual(ofCheck([making({ input_traceability_lot_code: '' , input_product_description: '', input_quantity: '', input_unit_of_measure: '' })], 'made-from-unknown-lot'), []);
});

test('duplicate-row: a row with the same cells as an earlier one, and a row that differs in one cell is not one', () => {
  const [f] = ofCheck([shipping(), shipping()], 'duplicate-row');
  assert.equal(f.message, 'Row 2 has the same cells as row 1, on line 2, so one event is counted twice.');
  assert.equal(f.line, 3);
  assert.deepEqual(ofCheck([shipping(), shipping({ quantity: '401' })], 'duplicate-row'), []);
  assert.deepEqual(ofCheck([shipping(), shipping({ reference_document_number: 'BOL-1002' })], 'duplicate-row'), []);
  assert.equal(ofCheck([shipping(), shipping(), shipping()], 'duplicate-row').length, 2, 'each repeat is reported');
  assert.equal(ofCheck([shipping({ product_description: ' Romaine hearts, 3 count, film bag ' }), shipping()], 'duplicate-row').length, 1, 'white space around a cell does not make a row different');
  assert.deepEqual(ofCheck([making(), making({ input_traceability_lot_code: 'LOT-B8' })], 'duplicate-row'), [], 'two input rows of one new product are two rows');
});

// ---- the header and the rows ----

test('column-unknown and column-duplicate: names read in any case with any separator, a nearest column named, and the first of two kept', () => {
  const header = (names) => `${names.join(',')}\nshipping,5\n`;
  const f = findingsOf(header(['event_type', 'Traceability Lot Codes']));
  assert.equal(f[0].id, 'column-unknown');
  assert.match(f[0].message, /^The column "Traceability Lot Codes" is not a column the tool reads, so the values under it are not checked\. Did you mean traceability_lot_code\?$/);
  assert.equal(f[0].line, 1);
  assert.equal(f[0].column, 'event_type,'.length + 1);
  assert.doesNotMatch(findingsOf(header(['event_type', 'customer note']))[0].message, /Did you mean/);
  assert.deepEqual(findingsOf(header(['EVENT TYPE', 'Quantity'])).filter((x) => x.id === 'column-unknown'), []);
  assert.deepEqual(findingsOf(header(['event-type', 'unit.of.measure'])).filter((x) => x.id === 'column-unknown'), []);
  const dup = findingsOf(header(['event_type', 'quantity', 'Quantity']));
  assert.equal(dup.filter((x) => x.id === 'column-duplicate').length, 1);
  assert.match(dup.find((x) => x.id === 'column-duplicate').message, /^The column "Quantity" has the same name as column 2 once case and separators are ignored; only the first is read\.$/);
  assert.match(findingsOf(header(['event_type', '']))[0].message, /^Column 2 of the header has no name/);
  assert.ok(findingsOf(header(['event_type', ' - '])).some((x) => x.id === 'column-unknown'));
});

test('a table with no event_type column is not checked, and says why', () => {
  const r = checkText('kind,quantity\nshipping,5\n');
  assert.ok(r.findings.some((x) => x.id === 'column-unknown'));
  assert.ok(r.findings.some((x) => x.id === 'file-unreadable' && /has no event_type column/.test(x.message)));
  assert.deepEqual(r.notes, ['the file was not checked, because it has no event_type column']);
});

test('row-malformed: a row with more or fewer cells than the header is reported and left out of the other checks', () => {
  const header = 'event_type,traceability_lot_code,quantity,unit_of_measure';
  for (const [text, count] of [['shipping,LOT-1,5', 3], ['shipping,LOT-1,5,cases,extra', 5], ['shipping', 1], ['shipping,LOT-1,5,cases,,', 6]]) {
    const r = checkText(`${header}\n${text}\n`);
    const f = r.findings.filter((x) => x.id === 'row-malformed');
    assert.equal(f.length, 1, text);
    assert.equal(f[0].message.includes(`Row 1 has ${count} ${count === 1 ? 'cell' : 'cells'} but the header has 4`), true, text);
    assert.equal(r.findings.some((x) => x.id === 'kde-missing'), false, 'left out of the other checks');
    assert.equal(r.analysis.summary.skipped, 1);
  }
  assert.deepEqual(checkText(`${header}\nshipping,LOT-1,5,cases\n`).findings.filter((x) => x.id === 'row-malformed'), []);
  const comma = checkText(`${header}\nshipping,LOT-1,"5,5",cases\n`);
  assert.equal(comma.findings.filter((x) => x.id === 'row-malformed').length, 0, 'a comma in quotes is one cell');
  assert.equal(checkText(`${header}\nshipping,LOT-1,5,5,cases\n`).findings.filter((x) => x.id === 'row-malformed').length, 1, 'a comma that is not in quotes is a cell too many');
});

test('lines and columns: a finding points at the cell, also after a quoted cell that holds a line end', () => {
  const rows = [shipping({ product_description: 'Romaine\nhearts' }), shipping({ event_date: '2101-02-30', product_description: 'Kale' })];
  const text = table(rows);
  const [f] = ofCheck(text, 'date-invalid');
  assert.equal(f.line, lineOf(text, 'Kale'));
  assert.equal(f.line, 4);
  const line = text.split('\n')[f.line - 1];
  assert.equal(line.slice(f.column - 1, f.column - 1 + 10), '2101-02-30');
  const [m] = ofCheck([shipping({ event_location: '' })], 'kde-missing');
  const header = table([shipping({ event_location: '' })]).split('\n');
  assert.equal(header[1].split(',').length > 0, true);
  assert.equal(m.line, 2);
});

test('a limit on the findings of one check keeps the first of them, counts the rest, and the result still counts all of them', () => {
  const many = Array.from({ length: FINDING_CAP + 5 }, (_, i) => shipping({ event_date: '2101-02-30', reference_document_number: `BOL-${i}` }));
  const r = checkText(table(many));
  assert.equal(r.findings.filter((f) => f.id === 'date-invalid').length, FINDING_CAP);
  assert.equal(r.analysis.omitted.get('date-invalid'), 5);
  assert.ok(r.notes.includes(`5 more findings of date-invalid are not listed; the first ${FINDING_CAP} are`));
  const report = buildReport({ file: { file: 'mem.csv', format: 'CSV', bytes: 1, lines: 1 }, checked: r, version: '0' });
  assert.equal(report.rules.find((x) => x.id === 'date-invalid').findings, FINDING_CAP + 5);
  assert.equal(report.totals.byLevel.error, report.findings.filter((f) => f.severity === 'error').length + 5);
  assert.match(report.result.text, /^FAIL/);
});

test('the summary counts the rows, the kinds, the lot codes and the first and last event date', () => {
  const s = checkText(table(clean())).analysis.summary;
  assert.equal(s.rows, 8);
  assert.equal(s.columns, 31);
  assert.equal(s.read, 31);
  assert.equal(s.unread, 0);
  assert.equal(s.lots, 4);
  assert.deepEqual(s.types.map((t) => [t.id, t.rows, t.lots]), [['harvesting', 1, 0], ['cooling', 1, 0], ['initial_packing', 2, 2], ['first_land_based_receiving', 1, 1], ['shipping', 1, 1], ['receiving', 1, 1], ['transformation', 1, 1]]);
  assert.equal(s.firstDate, '2101-03-01');
  assert.equal(s.lastDate, '2101-03-04');
});
