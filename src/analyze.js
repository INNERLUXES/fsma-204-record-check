// The checks. analyze reads the table (src/csv.js, with the cells of secrets marked by src/secrets.js) column by column
// and row by row, then across rows, and returns the findings with their line and column, the notes, and a summary of what
// the file holds. Every check across rows works through maps, so one lot code in a hundred thousand rows stays linear.
// Nothing here reads a clock: the one moment is the one of --now, read by src/dates.js.

import { cellAt } from './csv.js';
import { DATE_COLUMNS, DATE_ORDER, ELEMENTS, EVENT_TYPES, QUANTITY_PAIRS, ASSIGNING, COLUMN_NAMES, nearest, normalizeName, typeOf } from './fields.js';
import { addDecimal, compareDecimal, formatDecimal, isZero, parseDecimal } from './decimal.js';
import { DATE_FORM, isFuture, readDate } from './dates.js';
import { safeText } from './text.js';

// A cell that says nothing is read as empty: these words, in any case.
export const PLACEHOLDERS = ['n/a', 'na', 'none', 'null', 'nil', 'tbd', 'unknown', '-', '--', '?'];

// How many findings of one check are kept; the rest are counted in omitted.
export const FINDING_CAP = 1000;

const isPlaceholder = (t) => PLACEHOLDERS.includes(t.toLowerCase());

const show = (t, max = 60) => safeText(t, max);
const unitKey = (u) => u.toLowerCase().replace(/\s+/g, ' ');
const placeKey = (t) => t.toLowerCase().replace(/\s+/g, ' ');
const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

// One row of the table, read through the header. get(column) is the trimmed text of a cell, '' where the column is not in
// the file, and null where the cell holds a secret, which no check reads.
class Rec {
  constructor(raw, n, index, secretColumns) {
    this.raw = raw;
    this.n = n;
    this.line = raw.line;
    this.index = index;
    this.secretColumns = secretColumns;
    this.dates = new Map();
    this.quantities = new Map();
  }

  slot(column) {
    return this.index.get(column);
  }

  get(column) {
    const i = this.index.get(column);
    if (i === undefined) return '';
    if (this.secretColumns.has(i) || this.raw.secrets?.has(i)) return null;
    return this.raw.cells[i].trim();
  }

  // Whether the cell says something: a secret does, because it was there but not read.
  has(column) {
    const v = this.get(column);
    return v === null || (v !== '' && !isPlaceholder(v));
  }

  hasAny(columns) {
    return columns.some((c) => this.has(c));
  }

  // The line and column of a cell of this row, or of the first cell when the column is not in the file.
  where(column) {
    const i = this.index.get(column);
    return cellAt(this.raw, i === undefined ? 0 : i);
  }
}

export function analyze(table, { now = null } = {}) {
  const findings = [];
  const counts = new Map();
  const omitted = new Map();
  const notes = [];
  const add = (id, where, message, subject = null) => {
    const seen = (counts.get(id) ?? 0) + 1;
    counts.set(id, seen);
    if (seen > FINDING_CAP) omitted.set(id, (omitted.get(id) ?? 0) + 1);
    else findings.push({ id, line: where.line, column: where.column, message, subject });
  };

  const { header, rows } = table;
  const secretColumns = table.secretColumns ?? new Set();
  const cell = (row, i) => cellAt(row, i);

  // The header: which column is which.
  const index = new Map();
  const unknown = [];
  header.cells.forEach((raw, i) => {
    if (secretColumns.has(i)) return;
    const name = normalizeName(raw);
    if (name === '') {
      add('column-unknown', cell(header, i), `Column ${i + 1} of the header has no name, so the values under it are not read.`);
      unknown.push(i);
    } else if (index.has(name)) {
      add('column-duplicate', cell(header, i), `The column "${show(raw)}" has the same name as column ${index.get(name) + 1} once case and separators are ignored; only the first is read.`);
    } else if (COLUMN_NAMES.includes(name)) index.set(name, i);
    else {
      const near = nearest(name, COLUMN_NAMES);
      add('column-unknown', cell(header, i), `The column "${show(raw)}" is not a column the tool reads, so the values under it are not checked.${near ? ` Did you mean ${near}?` : ''}`);
      unknown.push(i);
    }
  });
  if (!index.has('event_type')) {
    add('file-unreadable', cell(header, 0), 'The header has no event_type column, so the kind of event of a row is not known. Nothing in the file was checked.');
    return { findings, notes: ['the file was not checked, because it has no event_type column'], summary: null, omitted };
  }

  const recs = [];
  rows.forEach((raw, k) => {
    if (raw.cells.length !== header.cells.length) {
      add('row-malformed', cell(raw, 0), `Row ${k + 1} has ${raw.cells.length} ${raw.cells.length === 1 ? 'cell' : 'cells'} but the header has ${header.cells.length}; the row was left out of every other check. A cell that holds a comma, a tab or a line end must be in double quotes.`);
      return;
    }
    recs.push(new Rec(raw, k + 1, index, secretColumns));
  });

  const nowDate = now === null ? null : readDate(now);
  const absent = new Map();
  const typeRows = new Map(EVENT_TYPES.map((t) => [t.id, 0]));
  const typeLots = new Map(EVENT_TYPES.map((t) => [t.id, new Set()]));
  let otherRows = 0;
  const lots = new Set();
  const sourced = new Set();
  const shipments = new Map();
  const receipts = new Map();
  const shippingRows = [];
  const inputs = [];
  const duplicates = new Map();
  let firstDay = null;
  let lastDay = null;
  let sprouts = 0;

  for (const rec of recs) {
    const kind = rec.get('event_type');
    let type = null;
    if (kind !== null) {
      const id = normalizeName(kind);
      type = typeOf(id) ?? null;
      if (type === null) {
        otherRows += 1;
        const near = id === '' || isPlaceholder(kind) ? null : nearest(id, EVENT_TYPES.map((t) => t.id));
        const message = id === '' || isPlaceholder(kind)
          ? `Row ${rec.n} has no event_type, so the kind of critical tracking event is not known and its elements were not checked.`
          : `The event_type of row ${rec.n}, "${show(kind)}", is not one of the seven critical tracking events of 21 CFR 1.1310.${near ? ` Did you mean ${near}?` : ''} Its elements were not checked.`;
        add('event-type-unknown', rec.where('event_type'), message);
      }
    } else otherRows += 1;
    if (type) typeRows.set(type.id, typeRows.get(type.id) + 1);

    const lot = rec.get('traceability_lot_code');
    const lotText = lot !== null && lot !== '' && !isPlaceholder(lot) ? lot : null;
    if (lotText !== null) {
      lots.add(lotText);
      if (type) typeLots.get(type.id).add(lotText);
    }
    const subject = lotText === null ? null : show(lotText, 80);

    // Dates.
    for (const column of DATE_COLUMNS) {
      const v = rec.get(column);
      if (v === null || v === '' || isPlaceholder(v)) continue;
      const d = readDate(v);
      if (d.problem) {
        add('date-invalid', rec.where(column), `The ${column} of row ${rec.n}${type ? ` (${type.label})` : ''}, "${show(v)}", ${d.problem}.`, subject);
        continue;
      }
      rec.dates.set(column, d);
      if (column === 'event_date') {
        if (firstDay === null || d.day < firstDay.day) firstDay = { day: d.day, text: v };
        if (lastDay === null || d.day > lastDay.day) lastDay = { day: d.day, text: v };
      }
      if (nowDate && !nowDate.problem && isFuture(d, nowDate)) add('future-date', rec.where(column), `The ${column} of row ${rec.n}${type ? ` (${type.label})` : ''}, ${show(v)}, is after the moment given with --now.`, subject);
    }
    let previous = null;
    for (const column of DATE_ORDER) {
      const d = rec.dates.get(column);
      if (!d) continue;
      if (previous && d.day < previous.d.day) {
        add('dates-out-of-order', rec.where(column), `The ${column} of row ${rec.n}${type ? ` (${type.label})` : ''}, ${show(rec.get(column))}, is before the ${previous.column}, ${show(rec.get(previous.column))}.`, subject);
        break;
      }
      previous = { column, d };
    }

    // Quantities.
    for (const [qc, uc] of QUANTITY_PAIRS) {
      const q = rec.get(qc);
      const u = rec.get(uc);
      const qHas = q !== null && q !== '' && !isPlaceholder(q);
      const uHas = u !== null && u !== '' && !isPlaceholder(u);
      if (qHas && !uHas && index.has(uc)) add('quantity-unit-missing', rec.where(uc), `The ${qc} of row ${rec.n}${type ? ` (${type.label})` : ''}, ${show(q)}, has no unit of measure in the ${uc} column.`, subject);
      else if (!qHas && uHas && index.has(qc)) add('quantity-unit-missing', rec.where(qc), `The ${uc} of row ${rec.n}${type ? ` (${type.label})` : ''}, "${show(u)}", has no quantity in the ${qc} column.`, subject);
      if (qHas) {
        const d = parseDecimal(q);
        if (d === null) add('quantity-not-positive', rec.where(qc), `The ${qc} of row ${rec.n}${type ? ` (${type.label})` : ''}, "${show(q)}", is not a plain number above zero (no sign, separator, exponent or text, and at most 40 digits).`, subject);
        else if (isZero(d)) add('quantity-not-positive', rec.where(qc), `The ${qc} of row ${rec.n}${type ? ` (${type.label})` : ''} is zero; a quantity must be above zero.`, subject);
        else rec.quantities.set(qc, { d, unit: uHas ? unitKey(u) : null });
      }
    }

    // The key data elements of the kind of event.
    if (type) {
      for (const el of ELEMENTS[type.id](rec)) {
        const present = el.cols.filter((c) => index.has(c));
        if (present.length === 0) {
          if (el.conditional) absent.set(`~${el.cols.join('|')}`, { ...el, type, rows: (absent.get(`~${el.cols.join('|')}`)?.rows ?? 0) + 1 });
          else {
            const key = el.cols.join('|');
            const entry = absent.get(key) ?? { el, types: new Set(), rows: 0 };
            entry.types.add(type.label);
            entry.rows += 1;
            absent.set(key, entry);
          }
          continue;
        }
        let missing;
        if (el.quantity) {
          const q = el.cols.map((c) => (index.has(c) ? rec.has(c) : null));
          missing = q.every((x) => x === null || x === false) && q.some((x) => x === false);
        } else missing = !rec.hasAny(present);
        if (!missing) continue;
        const column = present[0];
        const raw = present.length === 1 ? rec.get(column) : '';
        const state = raw !== '' && raw !== null ? `holds the placeholder "${show(raw, 20)}"` : 'is empty';
        const names = present.map((c) => `"${c}"`);
        const where = `the ${names.length > 1 ? 'cells' : 'cell'} under ${list(names)} ${names.length > 1 ? 'are empty' : state}`;
        const lead = `Row ${rec.n} (${type.label}) has no ${el.label.replace(/^the /, '')}, which 21 CFR ${el.section} lists`;
        add(el.conditional ? 'kde-conditional-missing' : 'kde-missing', rec.where(column), `${lead}; ${where}.`, subject);
      }
      if (type.id === 'initial_packing' && /sprout/i.test(rec.get('commodity') ?? '')) sprouts += 1;
    }

    // Lot codes.
    if (type && (type.id === 'harvesting' || type.id === 'cooling') && lotText !== null) {
      add('lot-code-at-harvest-or-cooling', rec.where('traceability_lot_code'), `Row ${rec.n} (${type.label}) holds the lot code ${show(lotText, 80)}, but 21 CFR 1.1320 assigns a traceability lot code at initial packing, first land-based receiving or making a new product, and sets none for other activities.`, subject);
    }
    if (type && lotText !== null && (ASSIGNING.includes(type.id) || type.id === 'receiving')) sourced.add(lotText);
    if (type && type.id === 'shipping' && lotText !== null) {
      shippingRows.push({ rec, lot: lotText });
      const list_ = shipments.get(lotText) ?? [];
      list_.push(rec);
      shipments.set(lotText, list_);
    }
    if (type && type.id === 'receiving' && lotText !== null) {
      const list_ = receipts.get(lotText) ?? [];
      list_.push(rec);
      receipts.set(lotText, list_);
    }
    if (type && type.id === 'transformation') {
      const input = rec.get('input_traceability_lot_code');
      if (input !== null && input !== '' && !isPlaceholder(input)) inputs.push({ rec, lot: input, own: lotText });
    }

    // Repeated rows.
    const key = rec.raw.cells.map((c) => c.trim()).join('\u0001');
    const first = duplicates.get(key);
    if (first === undefined) duplicates.set(key, rec);
    else add('duplicate-row', cell(rec.raw, 0), `Row ${rec.n} has the same cells as row ${first.n}, on line ${first.line}, so one event is counted twice.`, subject);
  }

  // Columns the rows need and the file does not have, once each.
  for (const [key, entry] of absent) {
    if (key.startsWith('~')) {
      notes.push(`the file has no ${entry.cols.map((c) => `"${c}"`).join(' or ')} column, so ${entry.label} (21 CFR ${entry.section}) was not checked in ${entry.rows} ${entry.rows === 1 ? 'row' : 'rows'}`);
      continue;
    }
    const names = entry.el.cols.map((c) => `"${c}"`);
    const types = [...entry.types];
    const what = entry.el.quantity ? `${names.join(' and ')} columns` : `${names.join(' or ')} column`;
    add('column-missing', cell(header, 0), `The header has no ${what}, but the rows of ${list(types)} need ${entry.el.label} (21 CFR ${entry.el.section}); ${entry.rows} ${entry.rows === 1 ? 'row is' : 'rows are'} affected and none of them is reported for it one by one.`);
  }

  // Across rows.
  for (const [lot, list_] of receipts) {
    if (shipments.has(lot)) continue;
    for (const rec of list_) add('receiving-without-shipping', rec.where('traceability_lot_code'), `Row ${rec.n} (receiving) receives the lot code ${show(lot, 80)}, which no shipping row of the file ships.`, show(lot, 80));
  }
  for (const [lot, list_] of shipments) {
    if (receipts.has(lot)) continue;
    for (const rec of list_) add('shipping-without-receiving', rec.where('traceability_lot_code'), `Row ${rec.n} (shipping) ships the lot code ${show(lot, 80)}, which no receiving row of the file receives.`, show(lot, 80));
  }
  for (const [lot, received] of receipts) {
    const shipped = shipments.get(lot);
    if (!shipped) continue;
    const sent = new Map();
    for (const rec of shipped) {
      const q = rec.quantities.get('quantity');
      if (q && q.unit !== null) sent.set(q.unit, addDecimal(sent.get(q.unit) ?? { int: 0n, scale: 0 }, q.d));
    }
    const got = new Map();
    const flagged = new Set();
    for (const rec of received) {
      const q = rec.quantities.get('quantity');
      if (!q || q.unit === null || !sent.has(q.unit)) continue;
      const total = addDecimal(got.get(q.unit) ?? { int: 0n, scale: 0 }, q.d);
      got.set(q.unit, total);
      if (!flagged.has(q.unit) && compareDecimal(total, sent.get(q.unit)) > 0) {
        flagged.add(q.unit);
        add('received-more-than-shipped', rec.where('quantity'), `By row ${rec.n} (receiving) the lot code ${show(lot, 80)} is received ${formatDecimal(total)} ${show(q.unit, 30)} in total, more than the ${formatDecimal(sent.get(q.unit))} ${show(q.unit, 30)} that the shipping rows of the file ship.`, show(lot, 80));
      }
    }
  }
  for (const { rec, lot } of inputs) {
    if (lots.has(lot)) continue;
    add('made-from-unknown-lot', rec.where('input_traceability_lot_code'), `Row ${rec.n} (making a new product) uses the input lot code ${show(lot, 80)}, which no row of the file holds.`, show(lot, 80));
  }
  for (const { rec, lot } of shippingRows) {
    if (sourced.has(lot)) continue;
    const source = rec.get('tlc_source_location');
    const place = rec.get('event_location');
    if (source === null || place === null || source === '' || place === '' || placeKey(source) !== placeKey(place)) continue;
    add('lot-code-new-at-shipping', rec.where('tlc_source_location'), `Row ${rec.n} (shipping) names the place it ships from as the source of the lot code ${show(lot, 80)}, but no row of the file assigns that lot code, and 21 CFR 1.1320(b) says not to establish a new lot code when shipping.`, show(lot, 80));
  }

  if (sprouts > 0) notes.push(`${sprouts} ${sprouts === 1 ? 'row of initial packing names' : 'rows of initial packing name'} sprouts; 21 CFR 1.1330(b) lists further elements for sprouts (the seed supply chain), which the tool does not check`);
  if (now === null) notes.push('no --now was given, so future-date did not run');
  else if (nowDate.problem) notes.push('--now could not be read, so future-date did not run');
  for (const [id, n] of omitted) notes.push(`${n.toLocaleString('en-US')} more findings of ${id} are not listed; the first ${FINDING_CAP} are`);

  const byType = EVENT_TYPES.map((t) => ({ id: t.id, label: t.label, rows: typeRows.get(t.id), lots: typeLots.get(t.id).size })).filter((t) => t.rows > 0);
  if (otherRows > 0) byType.push({ id: 'other', label: 'no known kind', rows: otherRows, lots: 0 });
  const summary = {
    rows: recs.length,
    skipped: rows.length - recs.length,
    columns: header.cells.length,
    read: index.size,
    unread: unknown.length + [...secretColumns].length,
    lots: lots.size,
    types: byType,
    firstDate: firstDay ? show(firstDay.text, 40) : null,
    lastDate: lastDay ? show(lastDay.text, 40) : null
  };
  return { findings, notes, summary, omitted };
}
