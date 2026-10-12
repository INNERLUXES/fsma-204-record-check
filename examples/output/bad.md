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
