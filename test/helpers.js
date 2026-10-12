// Shared test helpers: records built inline as CSV text, checked in memory or written into a temporary folder that is
// removed after the test. Paths are built with resolve() from forward-slash names, so the same test runs on Linux, macOS
// and Windows. The line a test expects is found with lineOf(), which counts lines the way the reader does, so a test never
// holds a line number worked out by hand for one system only. No test reads the clock, the time zone or the locale.
// Every business, place and phone number is made up, and every date is in the made-up year 2101.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { COLUMN_NAMES, checkText, main } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'fsma-204-record-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// The line (from 1) of the n-th place where needle starts in text.
export function lineOf(text, needle, n = 1) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return text.slice(0, at).split('\n').length;
}

// The moment the tests are checked at.
export const NOW = '2101-03-10T12:00:00Z';

export const FARM = 'Green Valley Farm, 555-0111, 12 Orchard Road, Springfield, ST 00001';
export const PACKER = 'Sample Packing House, 555-0122, 40 Cold Storage Lane, Springfield, ST 00002';
export const DEPOT = 'Example Distribution Center, 555-0133, 7 Freight Way, Rivertown, ST 00003';
export const STORE = 'Demo Market Store 5, 555-0144, 90 Main Street, Lakeside, ST 00004';
export const MAKER = 'Test Kitchen Foods, 555-0155, 3 Prep Street, Rivertown, ST 00005';
export const SUPPLIER = 'Sample Roots Supplier, 555-0166, 18 Field Road, Springfield, ST 00006';
export const DOCK = 'Harbor Landing Dock, 555-0177, 1 Wharf Road, Baytown, ST 00007';

const quote = (v) => (/[",\n\r\t]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// One line of text from an object of column -> value, for these columns.
export const lineOfRow = (row, columns = COLUMN_NAMES, delimiter = ',') => columns.map((c) => quote(row[c] ?? '')).join(delimiter);

// A table as text: the header and the rows, with LF line ends. over is the list of columns (default: all of them).
export const table = (rows, columns = COLUMN_NAMES, delimiter = ',') => `${[columns.join(delimiter), ...rows.map((r) => (typeof r === 'string' ? r : lineOfRow(r, columns, delimiter)))].join('\n')}\n`;

// Rows of each kind of event that pass every check, with lot codes and dates that other rows can build on. over replaces
// cells; a cell set to undefined is left empty.
const make = (base) => (over = {}) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) delete out[k];
    else out[k] = v;
  }
  return out;
};

export const harvesting = make({ event_type: 'harvesting', commodity: 'Romaine lettuce', quantity: '40', unit_of_measure: 'bins', event_date: '2101-03-01', growing_area: 'Field 7', farm_location: FARM, subsequent_recipient_location: PACKER, reference_document_type: 'field tag', reference_document_number: 'FT-0001' });
export const cooling = make({ event_type: 'cooling', commodity: 'Romaine lettuce', quantity: '40', unit_of_measure: 'bins', event_date: '2101-03-01', event_location: FARM, farm_location: FARM, subsequent_recipient_location: PACKER, reference_document_type: 'field tag', reference_document_number: 'FT-0001' });
export const packing = make({ event_type: 'initial_packing', traceability_lot_code: 'LOT-A1', product_description: 'Romaine hearts, 3 count, film bag', commodity: 'Romaine lettuce', quantity: '400', unit_of_measure: 'cases', received_quantity: '40', received_unit_of_measure: 'bins', event_date: '2101-03-02', receipt_date: '2101-03-02', harvest_date: '2101-03-01', cooling_date: '2101-03-01', growing_area: 'Field 7', event_location: PACKER, farm_location: FARM, harvester_contact: 'Green Valley Farm, 555-0111', reference_document_type: 'production log', reference_document_number: 'PL-0007' });
export const packingExempt = make({ event_type: 'initial_packing', traceability_lot_code: 'LOT-B7', product_description: 'Carrots, 25 lb sack', commodity: 'Carrots', quantity: '280', unit_of_measure: 'sacks', received_quantity: '300', received_unit_of_measure: 'kg', event_date: '2101-03-02', receipt_date: '2101-03-01', event_location: MAKER, previous_source_location: SUPPLIER, reference_document_type: 'purchase order', reference_document_number: 'PO-3301' });
export const landing = make({ event_type: 'first_land_based_receiving', traceability_lot_code: 'LOT-F2', species: 'Atlantic cod', quantity: '800', unit_of_measure: 'kg', event_date: '2101-03-01', harvest_date_range: '2101-02-26 to 2101-02-28', harvest_area: 'FAO Major Fishing Area 27', event_location: DOCK, reference_document_type: 'catch certificate', reference_document_number: 'CC-5001' });
export const shipping = make({ event_type: 'shipping', traceability_lot_code: 'LOT-A1', product_description: 'Romaine hearts, 3 count, film bag', quantity: '400', unit_of_measure: 'cases', event_date: '2101-03-03', event_location: PACKER, subsequent_recipient_location: DEPOT, tlc_source_location: PACKER, reference_document_type: 'bill of lading', reference_document_number: 'BOL-1001' });
export const receiving = make({ event_type: 'receiving', traceability_lot_code: 'LOT-A1', product_description: 'Romaine hearts, 3 count, film bag', quantity: '400', unit_of_measure: 'cases', event_date: '2101-03-04', event_location: DEPOT, previous_source_location: PACKER, tlc_source_location: PACKER, reference_document_type: 'bill of lading', reference_document_number: 'BOL-1001' });
export const making = make({ event_type: 'transformation', traceability_lot_code: 'LOT-C3', product_description: 'Diced carrot snack cups, 4 oz, cup', quantity: '1200', unit_of_measure: 'cups', event_date: '2101-03-03', event_location: MAKER, reference_document_type: 'work order', reference_document_number: 'WO-4410', input_traceability_lot_code: 'LOT-B7', input_product_description: 'Carrots, 25 lb sack', input_quantity: '250', input_unit_of_measure: 'sacks' });

// A table with one row of each kind of event, which passes every check at every level: it ships and receives LOT-A1, packs
// LOT-B7 from a person the subpart does not cover and makes LOT-C3 from it.
export const clean = () => [harvesting(), cooling(), packing(), shipping(), receiving(), packingExempt(), making(), landing()];

// The findings of a run in memory, for a text or for rows.
export const findingsOf = (p, options = {}) => checkText(typeof p === 'string' ? p : table(p), options).findings;

// The ids of the findings of a run.
export const idsOf = (p, options) => findingsOf(p, options).map((f) => f.id);

// The findings of one check.
export const ofCheck = (p, id, options) => findingsOf(p, options).filter((f) => f.id === id);

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, base) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// Writes the files and runs the command line in the folder.
export async function run(files, args) {
  return withFiles(files, (dir) => cli(args, dir));
}

// A clean file and one with a date that does not exist, for the command line tests.
export const GOOD = { 'records.csv': table(clean()) };
export const BAD = { 'records.csv': table([harvesting({ event_date: '2101-02-30' })]) };
export const ARGS = ['records.csv'];

// The time a hostile test may take: four times as long when the runner collects coverage, which sets NODE_V8_COVERAGE.
export const allowed = (ms) => (process.env.NODE_V8_COVERAGE ? ms * 4 : ms);
