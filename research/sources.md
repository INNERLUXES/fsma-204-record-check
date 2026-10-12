# Sources

The rule the documented checks of this tool are based on, with a short note in this project's own words on what the rule
says and which checks lean on it. Nothing here is a copy of the rule: read the rule itself for its exact wording. A plain
text copy of the sections the checks rest on, taken when they were read, is kept in [research/sources](sources) so that a
point can be checked against the rule it came from, and the copy is the rule's own words, not this project's. src/data.js
holds the rule and the points the reports show, and test/data.test.js checks that the rule in src/data.js is listed here
and has its copy, that no point quotes the rule at length, that every point names a section the copy holds, and that the
copy says what the documented checks rest on.

The tool reads a spreadsheet of traceability records and runs nothing; its result is an input to a review of traceability
records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA certification, and not a guarantee that the
records are true or that a firm meets the rule. These notes say what the rule says so a reader can follow a finding back
to its source. The rule was chosen with a web address that holds no number that reads like a year. Each section of it was
fetched with curl from the versioner API of ecfr.gov, which returns the section as XML, and turned into plain text with a
short script of this project's maintainers; every section is kept whole, one after the other, in one file. No browser and
no web search were used.

## The rule

- 21 CFR Part 1 Subpart S, the sections 1.1310, 1.1320, 1.1325, 1.1330, 1.1335, 1.1340, 1.1345, 1.1350 and 1.1455:
  https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S (copy:
  `research/sources/ecfr-21-cfr-1-subpart-s.txt`)

## What the rule says, and what it does not

- 21 CFR Part 1 Subpart S is the part of the food traceability rule (FSMA section 204) that lists the records a firm
  keeps for foods on the Food Traceability List. Section 1.1310 defines the terms. A critical tracking event is an event in
  the supply chain of a food that involves harvesting, cooling before initial packing, initial packing of a raw
  agricultural commodity other than a food from a fishing vessel, first land-based receiving of a food from a fishing
  vessel, shipping, receiving, or making a new product from a food (the rule's own name for that last event is the word kept in the event_type column, "transformation"). A key data element is the information a record holds for such an event.
  A location description is the business name, phone number, address and city, State and zip code of a place, or the same
  abroad. A product description names the product and gives the packaging size and style. A traceability lot code
  identifies a lot within the records of the place that assigned it. A reference document is a business document such as
  a bill of lading or a purchase order, and the reference document number is its identification number.
- So `event-type-unknown` is documented by 1.1310.
- Section 1.1320 says when a lot code is assigned: at initial packing of a raw agricultural commodity, at the first
  land-based receiving of a food from a fishing vessel, and when a new product is made from a food; and that a firm does not establish
  a new lot code for other activities such as shipping. So `lot-code-at-harvest-or-cooling` and `lot-code-new-at-shipping`
  are documented by 1.1320(a) and (b). The rule does not say how a record shows that a lot code is new, so what the tool
  looks for in the file (a shipping row that names its own place as the source of a lot code that no row assigns) is a
  reading of the rule and not a sentence of it, which the entry of the check in docs/rules-and-sources.md says.
- Sections 1.1325 (harvesting and cooling), 1.1330 (initial packing), 1.1335 (first land-based receiving), 1.1340
  (shipping), 1.1345 (receiving) and 1.1350 (the new lot made from a food) each list the elements the record holds, in
  numbered paragraphs, and link them to the lot. `kde-missing` and `kde-conditional-missing` are documented by them, and
  each finding names the paragraph. The elements are the same few kinds again and again: the lot code, the product
  description, the quantity and unit of measure, location descriptions of the parties (the next recipient, the previous
  source, the farm, the place of the event, the lot code source or a reference to it), the date of the event, and the
  reference document type and number. Quantity and unit of measure are one element in every section, so
  `quantity-unit-missing` rests on them, and the date of the event is one element in every section, so `date-invalid`
  rests on it. For initial packing and for receiving the rule has a second list, 1.1330(c) and 1.1345(b), for food that
  comes from a person to whom the subpart does not apply. The tool reads 1.1330(c) as a list of its own and does not read
  1.1345(b) apart from 1.1345(a), because the second makes the place of receipt the lot code source and the file does
  not say which of the two a row is (docs/limits.md).
- Section 1.1455(c)(3)(ii) says that when FDA asks for records to deal with an outbreak or a recall, the information of
  the event sections is given in an electronic sortable spreadsheet along with whatever is needed to understand it, with
  exceptions for small farms, small retailers and restaurants and small firms. That is why this tool reads a spreadsheet.
  Section 1.1455 also asks for records within 24 hours, keeps records for two years and lets a firm use records it has
  anyway; none of that is about the content of a row, and the tool does not check it.
- What the rule does not say matters as much. It does not fix the names or the order of the columns of the spreadsheet;
  the columns this tool reads are its own choice (docs/inputs.md). It does not fix how a date or a quantity is written, so
  asking for YYYY-MM-DD and for a plain number above zero are best practices of this tool. It sets no relation between
  the rows of one firm: where a lot is received against where it was shipped, how much of a lot is received, which lots
  a new product is made from, and whether a row is written twice are the tool's own choices, and `future-date`,
  `dates-out-of-order`, `receiving-without-shipping`, `shipping-without-receiving`, `received-more-than-shipped`,
  `made-from-unknown-lot`, `duplicate-row` and `quantity-not-positive` are best practices and say so. The rule does not
  say how to tell a food on the Food Traceability List from one that is not, or a covered firm from an exempt one; the
  list of foods and the exemptions are in other parts of the rule, which this project did not read, and the tool does not
  check them.
- The rule has extra elements for sprouts in 1.1330(b), about the seeds of the sprouts. The tool does not check them and
  says so in a note when a row of initial packing names sprouts.

## What the saved copy leaves out or writes differently

- Nothing is left out: each of the nine sections is whole, headings and numbered paragraphs included.
- The section sign is written Sec., and the typographic quotes and dashes of the rule are written as plain ASCII quotes
  and dashes, so that the copy is plain ASCII like every other file of the repository.
- The copy keeps the numbers the rule itself holds, among them the year its inflation adjustment uses as a baseline in
  1.1455. The copy is the rule's own words and is not read for numbers that read like a year (docs/decisions/0001).
- The title of the part and of the subpart are not in the copy, because the API returns a section and not its place in
  the code. They are named in docs/rules-and-sources.md by the address of the rule.

## What this project did not read

The other sections of the subpart: the list of foods that the rule applies to, the exemptions, the traceability plan, the compliance date and any waiver, and the guidance FDA has published. They are other documents, they change, and a firm decides for itself, with its own advice, what applies to it.
