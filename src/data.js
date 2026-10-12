// The rule the documented checks rest on, and the points of it that the reports show, written in this project's own
// words. The rule is named by its address; a text copy of the sections the checks rest on, read before they were listed,
// is kept under research/sources. research/sources.md lists the rule with a note, docs/rules-and-sources.md lists every
// check with its points, and test/data.test.js checks the three against each other.

export const LEVELS = ['info', 'warning', 'error'];

export const NOT_A = 'not legal advice and not an FDA certification, and not a guarantee that the records are true or that a firm meets the rule';

export const NOTICE = `This report is an input to a review of traceability records against 21 CFR Part 1 Subpart S: ${NOT_A}.`;

export const SOURCES = [
  { id: 'cfr', title: '21 CFR Part 1 Subpart S (Sec. 1.1310, 1.1320, 1.1325, 1.1330, 1.1335, 1.1340, 1.1345, 1.1350 and 1.1455), eCFR', url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S', file: 'research/sources/ecfr-21-cfr-1-subpart-s.txt' }
];

// Points: id -> { source, section, text }. The section is the part of the rule the point comes from.
export const POINTS = {
  'cte-definition': { source: 'cfr', section: '1.1310', text: 'The rule counts seven kinds of critical tracking event: harvesting, cooling before initial packing, initial packing of a raw agricultural commodity, first land-based receiving of a food from a fishing vessel, shipping, receiving, and making a new product from a food.' },
  'key-data-element': { source: 'cfr', section: '1.1310', text: 'A key data element is a piece of information tied to a critical tracking event that the rule makes a firm keep or pass on.' },
  'location-description': { source: 'cfr', section: '1.1310', text: 'A location description is contact information for a place where food is handled: the business name, a phone number, the street address or coordinates, and the city, State and zip code, or the same for a foreign place with its country.' },
  'product-description': { source: 'cfr', section: '1.1310', text: 'A product description names the product, with its brand, commodity and variety where there are any, and gives the size and the style of the packaging.' },
  'lot-code': { source: 'cfr', section: '1.1310', text: 'A traceability lot code is a descriptor, often letters and digits, that identifies one traceability lot within the records of the place that assigned it, which the rule calls the lot code source.' },
  'reference-document': { source: 'cfr', section: '1.1310', text: 'A reference document is a paper or electronic business document or record, such as a bill of lading, purchase order, invoice or production log, and its number is the identification number given to that document.' },
  'lot-code-when': { source: 'cfr', section: '1.1320(a)', text: 'A firm assigns a traceability lot code in three cases: when it initially packs a raw agricultural commodity, when it is the first land-based receiver of a food from a fishing vessel, and when it makes a new product from a food.' },
  'lot-code-not-elsewhere': { source: 'cfr', section: '1.1320(b)', text: 'Except where the subpart says otherwise, a firm does not establish a new traceability lot code for any other activity with a listed food, and the rule names shipping as an example.' },
  'harvesting-elements': { source: 'cfr', section: '1.1325(a)(1)', text: 'For a harvest the record holds the next recipient, the commodity, the quantity and unit, the farm, the field or growing container, the date of harvesting and the reference document type and number.' },
  'cooling-elements': { source: 'cfr', section: '1.1325(b)(1)', text: 'For cooling before initial packing the record holds the next recipient, the commodity, the quantity and unit, where the food was cooled, the date of cooling, the farm and the reference document type and number.' },
  'initial-packing-elements': { source: 'cfr', section: '1.1330(a)', text: 'For initial packing the record links to the lot what was received, with its date, quantity, farm, growing area, harvester and harvest date, and what was packed, with its new lot code, description, quantity, packing place, packing date and reference document.' },
  'initial-packing-exempt-source': { source: 'cfr', section: '1.1330(c)', text: 'When the food comes from a person the subpart does not cover, the packer keeps a shorter list: what was received, with its date, quantity and sender, and what was packed, with its lot code, description, quantity, packing place, packing date and reference document.' },
  'first-receiver-elements': { source: 'cfr', section: '1.1335', text: 'The first land-based receiver of a food from a fishing vessel keeps the lot code it assigned, the species or product description, the quantity and unit, the harvest dates and fishing areas, its own location, the date the food was landed and the reference document.' },
  'shipping-elements': { source: 'cfr', section: '1.1340(a)', text: 'For shipping the record holds the lot code, quantity and unit, product description, the next recipient, the place shipped from, the ship date, the lot code source or a reference to it, and the reference document type and number.' },
  'receiving-elements': { source: 'cfr', section: '1.1345(a)', text: 'For receiving the record holds the lot code, quantity and unit, product description, the previous source, the place of receipt, the receiving date, the lot code source or a reference to it, and the reference document type and number.' },
  'receiving-exempt-source': { source: 'cfr', section: '1.1345(b)', text: 'When the food comes from a person the subpart does not cover, the receiver keeps the same list except that the place of receipt is also the lot code source, and it assigns a lot code if none exists, unless it is a retail food establishment or a restaurant.' },
  'new-product-elements': { source: 'cfr', section: '1.1350(a)', text: 'For each new lot made from a food the record links to it every input lot with its code, description and quantity used, and the new lot with its code, the place it was made, the completion date, description, quantity and the reference document for the event.' },
  'quantity-and-unit': { source: 'cfr', section: '1.1325 to 1.1350', text: 'Every event the subpart lists asks for the quantity and the unit of measure together, with examples such as bins, cases, tanks, pounds and kilograms, so a number alone is not the element.' },
  'event-date': { source: 'cfr', section: '1.1325 to 1.1350', text: 'Every event the subpart lists asks for the date it took place: the date of harvesting, cooling, receiving, shipping, initial packing, landing or completion of the new product.' },
  'sortable-spreadsheet': { source: 'cfr', section: '1.1455(c)(3)(ii)', text: 'When FDA asks for the records to deal with an outbreak or a recall, a firm that is not a small one gives the information of the event sections in an electronic sortable spreadsheet, with whatever else is needed to understand it.' }
};

export const source = (id) => SOURCES.find((s) => s.id === id);
export const pointPage = (id) => source(POINTS[id].source);
