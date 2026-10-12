// The columns the tool reads, the seven kinds of critical tracking event, and the key data elements the rule lists for
// each kind. docs/inputs.md describes the columns, docs/rules-and-sources.md the sections.
//
// A column is found by its name written in any case, with any run of other characters in place of an underscore:
// "Traceability Lot Code", "traceability-lot-code" and "traceability_lot_code" are one column.

export const normalizeName = (text) => text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// The columns, with what each holds. quantity columns come in pairs with a unit column.
export const COLUMNS = [
  ['event_type', 'the kind of critical tracking event of the row'],
  ['traceability_lot_code', 'the traceability lot code of the food the row is about (for making a new product, the new lot)'],
  ['product_description', 'the product description: name, brand, variety, packaging size and style'],
  ['commodity', 'the commodity (and variety) of a raw agricultural commodity'],
  ['variety', 'the variety, when it is kept apart from the commodity'],
  ['species', 'the species or acceptable market name of an unpackaged food from a fishing vessel'],
  ['quantity', 'the quantity of the food of the row'],
  ['unit_of_measure', 'the unit of measure of the quantity: bins, cases, pounds, kg'],
  ['received_quantity', 'the quantity of the food received before it was initially packed'],
  ['received_unit_of_measure', 'the unit of measure of the received quantity'],
  ['event_date', 'the date of the event: harvesting, cooling, initial packing, landing, shipping, receiving or completion'],
  ['receipt_date', 'the date the food was received by the initial packer'],
  ['harvest_date', 'the date of harvesting, kept by the initial packer'],
  ['cooling_date', 'the date of cooling, kept by the initial packer, if it applies'],
  ['harvest_date_range', 'the harvest dates of the trip, for food from a fishing vessel'],
  ['harvest_area', 'the fishing area of the trip, for food from a fishing vessel'],
  ['growing_area', 'the field or other growing area, or the container of aquacultured food'],
  ['event_location', 'the location description of the place where the event took place'],
  ['farm_location', 'the location description of the farm where the food was harvested'],
  ['cooling_location', 'the location description of the place where the food was cooled, if it applies'],
  ['subsequent_recipient_location', 'the location description of the immediate subsequent recipient, other than a transporter'],
  ['previous_source_location', 'the location description of the immediate previous source, other than a transporter'],
  ['tlc_source_location', 'the location description of the traceability lot code source'],
  ['tlc_source_reference', 'the traceability lot code source reference, such as a facility registration number or a web address'],
  ['harvester_contact', 'the business name and phone number of the harvester'],
  ['reference_document_type', 'the type of the reference document: bill of lading, purchase order, invoice'],
  ['reference_document_number', 'the number of the reference document'],
  ['input_traceability_lot_code', 'making a new product: the lot code of one input lot'],
  ['input_product_description', 'making a new product: the product description of that input lot'],
  ['input_quantity', 'making a new product: the quantity used from that input lot'],
  ['input_unit_of_measure', 'making a new product: the unit of measure of that quantity']
].map(([name, summary]) => ({ name, summary }));

export const COLUMN_NAMES = COLUMNS.map((c) => c.name);

// The columns that hold a date, and the quantity columns with their unit columns.
export const DATE_COLUMNS = ['event_date', 'receipt_date', 'harvest_date', 'cooling_date'];
export const QUANTITY_PAIRS = [['quantity', 'unit_of_measure'], ['received_quantity', 'received_unit_of_measure'], ['input_quantity', 'input_unit_of_measure']];

// The order in which the dates of one row come, earliest first.
export const DATE_ORDER = ['harvest_date', 'cooling_date', 'receipt_date', 'event_date'];

// The seven kinds of critical tracking event. label is how a report names the kind; section is the section of the rule
// that lists its elements. The value of the event_type column is the id, written in any case with any separator.
export const EVENT_TYPES = [
  { id: 'harvesting', label: 'harvesting', section: '1.1325(a)(1)', point: 'harvesting-elements' },
  { id: 'cooling', label: 'cooling', section: '1.1325(b)(1)', point: 'cooling-elements' },
  { id: 'initial_packing', label: 'initial packing', section: '1.1330', point: 'initial-packing-elements' },
  { id: 'first_land_based_receiving', label: 'first land-based receiving', section: '1.1335', point: 'first-receiver-elements' },
  { id: 'shipping', label: 'shipping', section: '1.1340(a)', point: 'shipping-elements' },
  { id: 'receiving', label: 'receiving', section: '1.1345(a)', point: 'receiving-elements' },
  { id: 'transformation', label: 'making a new product', section: '1.1350(a)', point: 'new-product-elements' }
];

export const typeOf = (id) => EVENT_TYPES.find((t) => t.id === id);

// The kinds of event that assign a traceability lot code (1.1320(a)).
export const ASSIGNING = ['initial_packing', 'first_land_based_receiving', 'transformation'];

// An element: what the rule lists, the section, the columns that can hold it (any one is enough), and whether the rule
// asks for it only where it applies. A quantity element names its quantity and unit columns.
const el = (section, label, cols, extra = {}) => ({ section, label, cols, ...extra });
const qty = (section, label, q = 'quantity', u = 'unit_of_measure') => ({ section, label, cols: [q, u], quantity: true });
const doc = (section) => [el(section, 'the reference document type', ['reference_document_type']), el(section, 'the reference document number', ['reference_document_number'])];

// Elements by kind of event. A kind with variants has a function that picks the variant from the row.
export const ELEMENTS = {
  harvesting: () => [
    el('1.1325(a)(1)(i)', 'the location description for the immediate subsequent recipient', ['subsequent_recipient_location']),
    el('1.1325(a)(1)(ii)', 'the commodity', ['commodity']),
    qty('1.1325(a)(1)(iii)', 'the quantity and unit of measure'),
    el('1.1325(a)(1)(iv)', 'the location description for the farm', ['farm_location']),
    el('1.1325(a)(1)(v) and (vi)', 'the field or other growing area (produce), or the container (aquacultured food)', ['growing_area'], { conditional: true }),
    el('1.1325(a)(1)(vii)', 'the date of harvesting', ['event_date']),
    ...doc('1.1325(a)(1)(viii)')
  ],
  cooling: () => [
    el('1.1325(b)(1)(i)', 'the location description for the immediate subsequent recipient', ['subsequent_recipient_location']),
    el('1.1325(b)(1)(ii)', 'the commodity', ['commodity']),
    qty('1.1325(b)(1)(iii)', 'the quantity and unit of measure'),
    el('1.1325(b)(1)(iv)', 'the location description for where the food was cooled', ['event_location']),
    el('1.1325(b)(1)(v)', 'the date of cooling', ['event_date']),
    el('1.1325(b)(1)(vi)', 'the location description for the farm', ['farm_location']),
    ...doc('1.1325(b)(1)(vii)')
  ],
  initial_packing: (row) => {
    // 1.1330(c) applies when the food came from a person the subpart does not cover: a previous source and no farm.
    const exempt = row.has('previous_source_location') && !row.has('farm_location');
    if (exempt) {
      return [
        el('1.1330(c)(1)', 'the commodity of the food received', ['commodity']),
        el('1.1330(c)(2)', 'the date the food was received', ['receipt_date']),
        qty('1.1330(c)(3)', 'the quantity and unit of measure of the food received', 'received_quantity', 'received_unit_of_measure'),
        el('1.1330(c)(5)', 'the traceability lot code assigned', ['traceability_lot_code']),
        el('1.1330(c)(6)', 'the product description of the packed food', ['product_description']),
        qty('1.1330(c)(7)', 'the quantity and unit of measure of the packed food'),
        el('1.1330(c)(8)', 'the location description for where the food was initially packed (the traceability lot code source)', ['event_location']),
        el('1.1330(c)(9)', 'the date of initial packing', ['event_date']),
        ...doc('1.1330(c)(10)')
      ];
    }
    return [
      el('1.1330(a)(1)', 'the commodity of the food received', ['commodity']),
      el('1.1330(a)(2)', 'the date the food was received', ['receipt_date']),
      qty('1.1330(a)(3)', 'the quantity and unit of measure of the food received', 'received_quantity', 'received_unit_of_measure'),
      el('1.1330(a)(4)', 'the location description for the farm where the food was harvested', ['farm_location']),
      el('1.1330(a)(5) and (6)', 'the field or other growing area (produce), or the container (aquacultured food)', ['growing_area'], { conditional: true }),
      el('1.1330(a)(7)', 'the business name and phone number for the harvester', ['harvester_contact']),
      el('1.1330(a)(8)', 'the date of harvesting', ['harvest_date']),
      el('1.1330(a)(11)', 'the traceability lot code assigned', ['traceability_lot_code']),
      el('1.1330(a)(12)', 'the product description of the packed food', ['product_description']),
      qty('1.1330(a)(13)', 'the quantity and unit of measure of the packed food'),
      el('1.1330(a)(14)', 'the location description for where the food was initially packed (the traceability lot code source)', ['event_location']),
      el('1.1330(a)(15)', 'the date of initial packing', ['event_date']),
      ...doc('1.1330(a)(16)')
    ];
  },
  first_land_based_receiving: () => [
    el('1.1335(a)', 'the traceability lot code assigned', ['traceability_lot_code']),
    el('1.1335(b)', 'the species or acceptable market name, or the product description', ['species', 'product_description']),
    qty('1.1335(c)', 'the quantity and unit of measure'),
    el('1.1335(d)', 'the harvest date range of the trip', ['harvest_date_range']),
    el('1.1335(d)', 'the harvest locations (fishing areas) of the trip', ['harvest_area']),
    el('1.1335(e)', 'the location description for the first land-based receiver (the traceability lot code source)', ['event_location']),
    el('1.1335(f)', 'the date the food was landed', ['event_date']),
    ...doc('1.1335(g)')
  ],
  shipping: () => [
    el('1.1340(a)(1)', 'the traceability lot code', ['traceability_lot_code']),
    qty('1.1340(a)(2)', 'the quantity and unit of measure'),
    el('1.1340(a)(3)', 'the product description', ['product_description']),
    el('1.1340(a)(4)', 'the location description for the immediate subsequent recipient', ['subsequent_recipient_location']),
    el('1.1340(a)(5)', 'the location description for the location from which the food was shipped', ['event_location']),
    el('1.1340(a)(6)', 'the date the food was shipped', ['event_date']),
    el('1.1340(a)(7)', 'the location description for the traceability lot code source, or the traceability lot code source reference', ['tlc_source_location', 'tlc_source_reference']),
    ...doc('1.1340(a)(8)')
  ],
  receiving: () => [
    el('1.1345(a)(1)', 'the traceability lot code', ['traceability_lot_code']),
    qty('1.1345(a)(2)', 'the quantity and unit of measure'),
    el('1.1345(a)(3)', 'the product description', ['product_description']),
    el('1.1345(a)(4)', 'the location description for the immediate previous source', ['previous_source_location']),
    el('1.1345(a)(5)', 'the location description for where the food was received', ['event_location']),
    el('1.1345(a)(6)', 'the date the food was received', ['event_date']),
    el('1.1345(a)(7)', 'the location description for the traceability lot code source, or the traceability lot code source reference', ['tlc_source_location', 'tlc_source_reference']),
    ...doc('1.1345(a)(8)')
  ],
  'transformation': (row) => {
    const out = [
      el('1.1350(a)(2)(i)', 'the new traceability lot code', ['traceability_lot_code']),
      el('1.1350(a)(2)(ii)', 'the location description for where the new product was made (the traceability lot code source)', ['event_location']),
      el('1.1350(a)(2)(iii)', 'the date the new product was completed', ['event_date']),
      el('1.1350(a)(2)(iv)', 'the product description of the new product', ['product_description']),
      qty('1.1350(a)(2)(v)', 'the quantity and unit of measure of the new product'),
      ...doc('1.1350(a)(2)(vi)')
    ];
    // The inputs are listed only where the food of an input is on the Food Traceability List (1.1350(a)(1) "if applicable"):
    // a row that names no input is not asked for one.
    if (row.hasAny(['input_traceability_lot_code', 'input_product_description', 'input_quantity', 'input_unit_of_measure'])) {
      out.push(
        el('1.1350(a)(1)(i)', 'the traceability lot code of the input lot', ['input_traceability_lot_code']),
        el('1.1350(a)(1)(ii)', 'the product description of the input lot', ['input_product_description']),
        qty('1.1350(a)(1)(iii)', 'the quantity and unit of measure used from the input lot', 'input_quantity', 'input_unit_of_measure')
      );
    }
    return out;
  }
};

// The columns an element needs at all: if none of them is in the file, the element cannot be given.
export const columnsOf = (element) => element.cols;

// The number of edits (insert, delete, replace) between two short texts, capped.
export function editDistance(a, b) {
  const x = a.slice(0, 60);
  const y = b.slice(0, 60);
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= y.length; j += 1) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}

// The name nearest to a text, within two edits, or null.
export function nearest(text, names) {
  let best = null;
  let bestDistance = 3;
  for (const n of names) {
    const d = editDistance(text, n);
    if (d < bestDistance) {
      best = n;
      bestDistance = d;
    }
  }
  return best;
}
