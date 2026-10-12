# fsma-204-record-check: examples/bad/records.csv

- File: examples/bad/records.csv \(CSV, 13 lines, 3,677 bytes\)
- Rows: 11 \(1 harvesting, 1 cooling, 1 initial packing, 3 shipping, 3 receiving, 1 making a new product and 1 no known kind\); 1 row left out as malformed
- Columns: 31 in the header, 29 read, 1 not read
- Lots: 7 traceability lot codes
- Event dates: from 2101-03-04 to 2101-04-20
- Now: 2101-03-10T12:00:00Z, from --now
- Findings: 21 \(11 error, 8 warning, 2 info\)
- Result: **FAIL - 11 findings at or above error \(11 error, 8 warning, 2 info\)**

## Findings

| Level | Check | Where | Message |
| --- | --- | --- | --- |
| error | column-missing | examples/bad/records.csv:1 | The header has no "harvester\_contact" column, but the rows of initial packing need the business name and phone number for the harvester \(21 CFR 1.1330\(a\)\(7\)\); 1 row is affected and none of them is reported for it one by one. Fix: Add the column named to the spreadsheet and fill it for the rows that need it; docs/inputs.md lists every column. |
| error | column-duplicate | examples/bad/records.csv:1 | The column "Event Date" has the same name as column 11 once case and separators are ignored; only the first is read. Fix: Keep one column of each name. |
| error | date-invalid | examples/bad/records.csv:2 | The event\_date of row 1 \(harvesting\), "03/04/2101", is written like a date of the United States; write YYYY-MM-DD, or YYYY-MM-DDThh:mm:ss with a time zone, Z or \+hh:mm, because the tool does not guess whether the first number is the month or the day. Fix: Write the date as YYYY-MM-DD: four digits for the year, two for the month and two for the day. |
| error | quantity-not-positive | examples/bad/records.csv:3 | The quantity of row 2 \(cooling\) is zero; a quantity must be above zero. Fix: Write the quantity as a plain number above zero, such as 25 or 12.5, with no unit in the cell. |
| error | kde-missing | examples/bad/records.csv:3 | Row 2 \(cooling\) has no reference document number, which 21 CFR 1.1325\(b\)\(1\)\(vii\) lists; the cell under "reference\_document\_number" is empty. Fix: Fill the element named in the cell named, from the business record the row comes from; docs/inputs.md says which column holds each element. |
| error | event-type-unknown | examples/bad/records.csv:4 | The event\_type of row 3, "Shiping", is not one of the seven critical tracking events of 21 CFR 1.1310. Did you mean shipping? Its elements were not checked. Fix: Write one of "harvesting", "cooling", "initial\_packing", "first\_land\_based\_receiving", "shipping", "receiving" or "transformation" in the event\_type column. |
| error | kde-missing | examples/bad/records.csv:5 | Row 4 \(initial packing\) has no product description of the packed food, which 21 CFR 1.1330\(a\)\(12\) lists; the cell under "product\_description" holds the placeholder "n/a". Fix: Fill the element named in the cell named, from the business record the row comes from; docs/inputs.md says which column holds each element. |
| error | quantity-unit-missing | examples/bad/records.csv:5 | The quantity of row 4 \(initial packing\), 40, has no unit of measure in the unit\_of\_measure column. Fix: Give the unit of measure with the quantity, such as cases, pounds or kg, and the quantity with the unit. |
| error | secret-in-file | examples/bad/records.csv:10 | A cell of the column "product\_description" is shaped like a mnemonic. The tool never reads a seed or a key, and the value is not shown. Fix: Remove the value from the file and from wherever the file was copied, treat it as exposed and move what it controls to a new key. A traceability record names food, lots, places and documents, never the key of an account. |
| error | row-malformed | examples/bad/records.csv:12 | Row 11 has 4 cells but the header has 31; the row was left out of every other check. A cell that holds a comma, a tab or a line end must be in double quotes. Fix: Put a cell that holds a comma, a tab or a line end in double quotes, and write a quote inside it as two quotes. |
| error | future-date | examples/bad/records.csv:13 | The event\_date of row 12 \(shipping\), 2101-04-20, is after the moment given with --now. Fix: Correct the date or the clock of the system that wrote it; an event cannot be recorded before it took place. |
| warning | column-unknown | examples/bad/records.csv:1 | The column "harvest\_dat" is not a column the tool reads, so the values under it are not checked. Did you mean harvest\_date? Fix: Correct the name to a column of docs/inputs.md, or leave the column in if it is for your own use. |
| warning | lot-code-at-harvest-or-cooling | examples/bad/records.csv:2 | Row 1 \(harvesting\) holds the lot code LOT-H1, but 21 CFR 1.1320 assigns a traceability lot code at initial packing, first land-based receiving or making a new product, and sets none for other activities. Fix: Leave the lot code out of the harvesting and cooling rows; the packer assigns it when it initially packs the food. |
| warning | kde-conditional-missing | examples/bad/records.csv:2 | Row 1 \(harvesting\) has no field or other growing area \(produce\), or the container \(aquacultured food\), which 21 CFR 1.1325\(a\)\(1\)\(v\) and \(vi\) lists; the cell under "growing\_area" is empty. Fix: Name the field, growing area or container as the grower does; leave it empty only for a food that is neither produce nor aquacultured. |
| warning | dates-out-of-order | examples/bad/records.csv:5 | The receipt\_date of row 4 \(initial packing\), 2101-03-05, is before the harvest\_date, 2101-03-07. Fix: Check each date against the business record; food cannot be received before it is harvested or packed before it is received. |
| warning | lot-code-new-at-shipping | examples/bad/records.csv:6 | Row 5 \(shipping\) names the place it ships from as the source of the lot code LOT-Z9, but no row of the file assigns that lot code, and 21 CFR 1.1320\(b\) says not to establish a new lot code when shipping. Fix: Ship the food under the lot code it already has, and add the row of the event that assigned it; if the lot code came from elsewhere, name that place as the lot code source. |
| warning | received-more-than-shipped | examples/bad/records.csv:9 | By row 8 \(receiving\) the lot code LOT-Q1 is received 130 cases in total, more than the 120 cases that the shipping rows of the file ship. Fix: Check the quantity and the unit of the receiving row named, and whether a shipping row of that lot is missing from the file. |
| warning | made-from-unknown-lot | examples/bad/records.csv:10 | Row 9 \(making a new product\) uses the input lot code LOT-X0, which no row of the file holds. Fix: Check the input lot code against the record of the receipt, or add the row that holds it; the input lot should be received, packed or made earlier in the file. |
| warning | duplicate-row | examples/bad/records.csv:11 | Row 10 has the same cells as row 8, on line 9, so one event is counted twice. Fix: Delete the repeated row, or correct the cell that should differ. |
| info | shipping-without-receiving | examples/bad/records.csv:6 | Row 5 \(shipping\) ships the lot code LOT-Z9, which no receiving row of the file receives. Fix: If the file is meant to hold both sides of the move, add the receiving row or correct the lot code; if it holds one firm, no change is needed. |
| info | receiving-without-shipping | examples/bad/records.csv:7 | Row 6 \(receiving\) receives the lot code LOT-R5, which no shipping row of the file ships. Fix: If the file is meant to hold both sides of the move, add the shipping row or correct the lot code; if it holds one firm, no change is needed. |

## Basis

### column-missing

- A problem with the file itself; it rests on no section of the rule.

### column-duplicate

- A problem with the file itself; it rests on no section of the rule.

### date-invalid

- Every event the subpart lists asks for the date it took place: the date of harvesting, cooling, receiving, shipping, initial packing, landing or completion of the new product. (21 CFR 1.1325 to 1.1350, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)

### quantity-not-positive

- The tool's own choice: asking for a positive plain number is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks for a quantity and says nothing about how it is written, but a quantity of zero or one that is text cannot be added up or compared

### kde-missing

- A key data element is a piece of information tied to a critical tracking event that the rule makes a firm keep or pass on. (21 CFR 1.1310, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- A location description is contact information for a place where food is handled: the business name, a phone number, the street address or coordinates, and the city, State and zip code, or the same for a foreign place with its country. (21 CFR 1.1310, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- A product description names the product, with its brand, commodity and variety where there are any, and gives the size and the style of the packaging. (21 CFR 1.1310, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- A traceability lot code is a descriptor, often letters and digits, that identifies one traceability lot within the records of the place that assigned it, which the rule calls the lot code source. (21 CFR 1.1310, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- A reference document is a paper or electronic business document or record, such as a bill of lading, purchase order, invoice or production log, and its number is the identification number given to that document. (21 CFR 1.1310, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- For a harvest the record holds the next recipient, the commodity, the quantity and unit, the farm, the field or growing container, the date of harvesting and the reference document type and number. (21 CFR 1.1325\(a\)\(1\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- For cooling before initial packing the record holds the next recipient, the commodity, the quantity and unit, where the food was cooled, the date of cooling, the farm and the reference document type and number. (21 CFR 1.1325\(b\)\(1\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- For initial packing the record links to the lot what was received, with its date, quantity, farm, growing area, harvester and harvest date, and what was packed, with its new lot code, description, quantity, packing place, packing date and reference document. (21 CFR 1.1330\(a\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- When the food comes from a person the subpart does not cover, the packer keeps a shorter list: what was received, with its date, quantity and sender, and what was packed, with its lot code, description, quantity, packing place, packing date and reference document. (21 CFR 1.1330\(c\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- The first land-based receiver of a food from a fishing vessel keeps the lot code it assigned, the species or product description, the quantity and unit, the harvest dates and fishing areas, its own location, the date the food was landed and the reference document. (21 CFR 1.1335, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- For shipping the record holds the lot code, quantity and unit, product description, the next recipient, the place shipped from, the ship date, the lot code source or a reference to it, and the reference document type and number. (21 CFR 1.1340\(a\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- For receiving the record holds the lot code, quantity and unit, product description, the previous source, the place of receipt, the receiving date, the lot code source or a reference to it, and the reference document type and number. (21 CFR 1.1345\(a\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- When the food comes from a person the subpart does not cover, the receiver keeps the same list except that the place of receipt is also the lot code source, and it assigns a lot code if none exists, unless it is a retail food establishment or a restaurant. (21 CFR 1.1345\(b\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- For each new lot made from a food the record links to it every input lot with its code, description and quantity used, and the new lot with its code, the place it was made, the completion date, description, quantity and the reference document for the event. (21 CFR 1.1350\(a\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- When FDA asks for the records to deal with an outbreak or a recall, a firm that is not a small one gives the information of the event sections in an electronic sortable spreadsheet, with whatever else is needed to understand it. (21 CFR 1.1455\(c\)\(3\)\(ii\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)

### event-type-unknown

- The rule counts seven kinds of critical tracking event: harvesting, cooling before initial packing, initial packing of a raw agricultural commodity, first land-based receiving of a food from a fishing vessel, shipping, receiving, and making a new product from a food. (21 CFR 1.1310, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)

### quantity-unit-missing

- Every event the subpart lists asks for the quantity and the unit of measure together, with examples such as bins, cases, tanks, pounds and kilograms, so a number alone is not the element. (21 CFR 1.1325 to 1.1350, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)

### secret-in-file

- A problem with the file itself; it rests on no section of the rule.

### row-malformed

- A problem with the file itself; it rests on no section of the rule.

### future-date

- The tool's own choice: refusing a date from the future is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule sets none, and the tool reads no clock, so the moment is the one given with --now

### column-unknown

- A problem with the file itself; it rests on no section of the rule.

### lot-code-at-harvest-or-cooling

- A firm assigns a traceability lot code in three cases: when it initially packs a raw agricultural commodity, when it is the first land-based receiver of a food from a fishing vessel, and when it makes a new product from a food. (21 CFR 1.1320\(a\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- Except where the subpart says otherwise, a firm does not establish a new traceability lot code for any other activity with a listed food, and the rule names shipping as an example. (21 CFR 1.1320\(b\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)

### kde-conditional-missing

- For a harvest the record holds the next recipient, the commodity, the quantity and unit, the farm, the field or growing container, the date of harvesting and the reference document type and number. (21 CFR 1.1325\(a\)\(1\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- For initial packing the record links to the lot what was received, with its date, quantity, farm, growing area, harvester and harvest date, and what was packed, with its new lot code, description, quantity, packing place, packing date and reference document. (21 CFR 1.1330\(a\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)

### dates-out-of-order

- The tool's own choice: comparing the dates of a row this way is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks for each date and does not say how they relate, but food moves forward through its events

### lot-code-new-at-shipping

- Except where the subpart says otherwise, a firm does not establish a new traceability lot code for any other activity with a listed food, and the rule names shipping as an example. (21 CFR 1.1320\(b\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)
- A firm assigns a traceability lot code in three cases: when it initially packs a raw agricultural commodity, when it is the first land-based receiver of a food from a fishing vessel, and when it makes a new product from a food. (21 CFR 1.1320\(a\), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>)

### received-more-than-shipped

- The tool's own choice: adding up the quantities of a lot is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule says nothing about how much may be received, but a lot cannot arrive in a larger amount than was sent, and a file that holds only some of the shipments can show this by mistake

### made-from-unknown-lot

- The tool's own choice: following an input lot back to a row is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks for the input lot codes and does not ask that the file holds the row that explains each one, and a file that holds only some of the records can show this by mistake

### duplicate-row

- The tool's own choice: looking for repeated rows is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule does not mention them, but a repeated row doubles the quantity of a lot

### shipping-without-receiving

- The tool's own choice: matching a shipment with a receipt is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks each firm to keep its own records and does not ask for the two sides in one file, so this is a note

### receiving-without-shipping

- The tool's own choice: matching a receipt with a shipment is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks each firm to keep its own records and does not ask for the two sides in one file, so this is a note

## Event types (7)

| Event type | Rows | Lot codes |
| --- | --- | --- |
| harvesting | 1 | 1 |
| cooling | 1 | 0 |
| initial packing | 1 | 1 |
| shipping | 3 | 2 |
| receiving | 3 | 2 |
| making a new product | 1 | 1 |
| no known kind | 1 | 0 |

This report is an input to a review of traceability records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA certification, and not a guarantee that the records are true or that a firm meets the rule.
