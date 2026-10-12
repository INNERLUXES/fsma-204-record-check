# Rules and sources

Every check of the tool, with what it looks at, the points of the rule it rests on, what it cannot see, and what to change. The points are in this project's own words and are the ones the reports show with `--explain`; the sections of the rule were fetched and read before they were listed, and a text copy of them is kept under [research/sources](../research/sources) so that a point can be checked against the rule it came from. [../research/sources.md](../research/sources.md) has a note on the rule.

The tool is an input to a review of traceability records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA certification, and not a guarantee that the records are true or that a firm meets the rule. Seven checks are documented by the rule: the seven kinds of critical tracking event by 1.1310, the key data elements of each kind by 1.1325, 1.1330, 1.1335, 1.1340, 1.1345 and 1.1350, the lot code by 1.1320, the date and the quantity with its unit by the elements of those sections. Every other check that is not about the file itself is a best practice of this tool, not a rule of the subpart, and says so in its message and in its own entry below with the reason. The rule sets no relation between the rows of a file, so what is received against what was shipped, the lots a new product is made from and repeated rows are the tool's own choices.

## The rule

- 21 CFR Part 1 Subpart S (Sec. 1.1310, 1.1320, 1.1325, 1.1330, 1.1335, 1.1340, 1.1345, 1.1350 and 1.1455), eCFR: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S (copy: `research/sources/ecfr-21-cfr-1-subpart-s.txt`)

## file-unreadable

- Level: error
- Kind: input
- Looks at: the file is not a table the reader can follow (a quote never closed, text after a closing quote, a cell too long, semicolons for commas), holds no event_type column or holds a header and no rows, so nothing in it was checked.
- Cannot see: It stops at the first place the reader cannot follow, so nothing in the file is checked. A file with semicolons between the cells is refused, not guessed at, and a spreadsheet saved as XLSX is not read: save it as CSV or TSV.
- What to change: Save the records as CSV with commas or TSV with tabs, a header row and one row for each critical tracking event (docs/inputs.md); fix the line named.
- Points of the rule: none; this check is about the file itself.

## column-missing

- Level: error
- Kind: input
- Looks at: a column that the rows of a kind of event need is not in the header at all, so the element cannot be given in any of those rows; it is reported once, at the header, and not for each row.
- Cannot see: It reports a column that is absent from the header, not one that is present and empty; an empty cell is a kde-missing finding. It looks only at the columns that the kinds of event present in the file need, and it counts the rows that are affected.
- What to change: Add the column named to the spreadsheet and fill it for the rows that need it; docs/inputs.md lists every column.
- Points of the rule: none; this check is about the file itself.

## column-unknown

- Level: warning
- Kind: input
- Looks at: a column the tool does not read, often a misspelt name; nothing under it was checked.
- Cannot see: It cannot tell what an unknown column was meant to hold; it names a known column when one is within two edits of it. The values under the column are not read.
- What to change: Correct the name to a column of docs/inputs.md, or leave the column in if it is for your own use.
- Points of the rule: none; this check is about the file itself.

## column-duplicate

- Level: error
- Kind: input
- Looks at: two columns of the header have the same name once case and separators are ignored; only the first is read.
- Cannot see: It compares names after case and separators are ignored, so "Event Date" and event_date are one name. The second column is not read.
- What to change: Keep one column of each name.
- Points of the rule: none; this check is about the file itself.

## row-malformed

- Level: error
- Kind: input
- Looks at: a row with more or fewer cells than the header, which usually means a comma that is not in quotes; the row was left out of every other check.
- Cannot see: It counts cells, so it cannot tell which cell is the extra one. The row is left out of every other check, so a row that is malformed is never taken for a row that is fine.
- What to change: Put a cell that holds a comma, a tab or a line end in double quotes, and write a quote inside it as two quotes.
- Points of the rule: none; this check is about the file itself.

## secret-in-file

- Level: error
- Kind: input
- Looks at: the file holds a private key, a seed or a mnemonic, under a column named for one or as a cell shaped like one; the tool never reads it and never shows it.
- Cannot see: The search knows a secret by the name of its column and by its shape: a mnemonic of 12, 15, 18, 21 or 24 lowercase words of 3 to 8 letters, an extended private key, 64 hex digits or a key in WIF. A note of exactly twelve short lowercase words is reported too, which is the safe side. A cell of 64 hex digits in the lot code, input lot code or reference document number column is read as an identifier (a hash used as a lot code) and is not reported. A secret split over cells, encoded another way or written under another name is not caught, and passwords and API keys are not looked for by their shape. A clean run does not say that the file holds no secret.
- What to change: Remove the value from the file and from wherever the file was copied, treat it as exposed and move what it controls to a new key. A traceability record names food, lots, places and documents, never the key of an account.
- Points of the rule: none; this check is about the file itself.

## event-type-unknown

- Level: error
- Kind: documented
- Looks at: an event_type that is empty or is none of the seven critical tracking events of 1.1310: harvesting, cooling, initial packing, first land-based receiving, shipping, receiving and making a new product ("transformation" in the file); the row was left out of the element checks.
- Cannot see: It reads the value of the event_type column in any case with any separator, and cannot tell whether the kind of event is the right one for what happened, only that it is one of the seven. A row of an unknown kind is left out of the element checks.
- What to change: Write one of "harvesting", "cooling", "initial_packing", "first_land_based_receiving", "shipping", "receiving" or "transformation" in the event_type column.
- Points of the rule:
  - The rule counts seven kinds of critical tracking event: harvesting, cooling before initial packing, initial packing of a raw agricultural commodity, first land-based receiving of a food from a fishing vessel, shipping, receiving, and making a new product from a food. (21 CFR 1.1310)

## kde-missing

- Level: error
- Kind: documented
- Looks at: a key data element that the section of the rule lists for the kind of event is empty or a placeholder such as n/a: the lot code, the product description, the quantity and unit, a location description of the right party, a date, the reference document type or number, and for making a new product the inputs; the message names the section.
- Cannot see: It checks that a cell is neither empty nor a placeholder, never what is in it: a location description is not read for a phone number or a zip code, a product description for a package size, a reference document number for a real document. It does not know whether a food is on the Food Traceability List or whether a firm is exempt, so it cannot tell a row that the rule does not ask for from one that it does. For initial packing it takes the shorter list of 1.1330(c) when the row names a previous source and no farm. A receipt from a person the subpart does not cover (1.1345(b)) is asked for the lot code source like any other receipt, so the place of receipt is written in tlc_source_location too. The extra elements for sprouts (1.1330(b)) and the elements that the rule asks for only where they apply (the variety, the cooling of an initial packing, the lot code source reference of an initial packing, a first land-based receiving or a new product) are not asked for.
- What to change: Fill the element named in the cell named, from the business record the row comes from; docs/inputs.md says which column holds each element.
- Points of the rule:
  - A key data element is a piece of information tied to a critical tracking event that the rule makes a firm keep or pass on. (21 CFR 1.1310)
  - A location description is contact information for a place where food is handled: the business name, a phone number, the street address or coordinates, and the city, State and zip code, or the same for a foreign place with its country. (21 CFR 1.1310)
  - A product description names the product, with its brand, commodity and variety where there are any, and gives the size and the style of the packaging. (21 CFR 1.1310)
  - A traceability lot code is a descriptor, often letters and digits, that identifies one traceability lot within the records of the place that assigned it, which the rule calls the lot code source. (21 CFR 1.1310)
  - A reference document is a paper or electronic business document or record, such as a bill of lading, purchase order, invoice or production log, and its number is the identification number given to that document. (21 CFR 1.1310)
  - For a harvest the record holds the next recipient, the commodity, the quantity and unit, the farm, the field or growing container, the date of harvesting and the reference document type and number. (21 CFR 1.1325(a)(1))
  - For cooling before initial packing the record holds the next recipient, the commodity, the quantity and unit, where the food was cooled, the date of cooling, the farm and the reference document type and number. (21 CFR 1.1325(b)(1))
  - For initial packing the record links to the lot what was received, with its date, quantity, farm, growing area, harvester and harvest date, and what was packed, with its new lot code, description, quantity, packing place, packing date and reference document. (21 CFR 1.1330(a))
  - When the food comes from a person the subpart does not cover, the packer keeps a shorter list: what was received, with its date, quantity and sender, and what was packed, with its lot code, description, quantity, packing place, packing date and reference document. (21 CFR 1.1330(c))
  - The first land-based receiver of a food from a fishing vessel keeps the lot code it assigned, the species or product description, the quantity and unit, the harvest dates and fishing areas, its own location, the date the food was landed and the reference document. (21 CFR 1.1335)
  - For shipping the record holds the lot code, quantity and unit, product description, the next recipient, the place shipped from, the ship date, the lot code source or a reference to it, and the reference document type and number. (21 CFR 1.1340(a))
  - For receiving the record holds the lot code, quantity and unit, product description, the previous source, the place of receipt, the receiving date, the lot code source or a reference to it, and the reference document type and number. (21 CFR 1.1345(a))
  - When the food comes from a person the subpart does not cover, the receiver keeps the same list except that the place of receipt is also the lot code source, and it assigns a lot code if none exists, unless it is a retail food establishment or a restaurant. (21 CFR 1.1345(b))
  - For each new lot made from a food the record links to it every input lot with its code, description and quantity used, and the new lot with its code, the place it was made, the completion date, description, quantity and the reference document for the event. (21 CFR 1.1350(a))
  - When FDA asks for the records to deal with an outbreak or a recall, a firm that is not a small one gives the information of the event sections in an electronic sortable spreadsheet, with whatever else is needed to understand it. (21 CFR 1.1455(c)(3)(ii))

## kde-conditional-missing

- Level: warning
- Kind: documented
- Looks at: the field, growing area or container of a harvest or an initial packing is empty; the rule asks for it for produce and for aquacultured food, and the file does not say which food the row is about.
- Cannot see: It cannot tell whether the food is produce or aquacultured, the only cases where the rule asks for the growing area, so it is a warning and not an error. It is not asked for in the shorter list of 1.1330(c).
- What to change: Name the field, growing area or container as the grower does; leave it empty only for a food that is neither produce nor aquacultured.
- Points of the rule:
  - For a harvest the record holds the next recipient, the commodity, the quantity and unit, the farm, the field or growing container, the date of harvesting and the reference document type and number. (21 CFR 1.1325(a)(1))
  - For initial packing the record links to the lot what was received, with its date, quantity, farm, growing area, harvester and harvest date, and what was packed, with its new lot code, description, quantity, packing place, packing date and reference document. (21 CFR 1.1330(a))

## lot-code-at-harvest-or-cooling

- Level: warning
- Kind: documented
- Looks at: a row for harvesting or cooling holds a traceability lot code, though the rule assigns one at initial packing, first land-based receiving or making a new product, and sets no lot code for other activities.
- Cannot see: It sees a lot code in a harvesting or cooling row. A value there may be a field lot or a farm's own batch number and not a traceability lot code, which is why it is a warning.
- What to change: Leave the lot code out of the harvesting and cooling rows; the packer assigns it when it initially packs the food.
- Points of the rule:
  - A firm assigns a traceability lot code in three cases: when it initially packs a raw agricultural commodity, when it is the first land-based receiver of a food from a fishing vessel, and when it makes a new product from a food. (21 CFR 1.1320(a))
  - Except where the subpart says otherwise, a firm does not establish a new traceability lot code for any other activity with a listed food, and the rule names shipping as an example. (21 CFR 1.1320(b))

## lot-code-new-at-shipping

- Level: warning
- Kind: documented
- Looks at: a shipping row names the shipping location as the lot code source, but no row of the file assigns that lot code (initial packing, first land-based receiving, making a new product, or receiving); the rule says not to establish a new lot code when shipping.
- Cannot see: It reads the lot code source and the place shipped from as text, ignoring case and spacing, and looks for any row of the file that holds the lot code under initial packing, first land-based receiving, making a new product or receiving. A file that lacks the earlier records of a lot, and a shipper that wrote itself down as the source of a lot code it did not assign, look the same to it. The way the rule treats a receipt from a person the subpart does not cover is read from the receiving row.
- What to change: Ship the food under the lot code it already has, and add the row of the event that assigned it; if the lot code came from elsewhere, name that place as the lot code source.
- Points of the rule:
  - Except where the subpart says otherwise, a firm does not establish a new traceability lot code for any other activity with a listed food, and the rule names shipping as an example. (21 CFR 1.1320(b))
  - A firm assigns a traceability lot code in three cases: when it initially packs a raw agricultural commodity, when it is the first land-based receiver of a food from a fishing vessel, and when it makes a new product from a food. (21 CFR 1.1320(a))

## date-invalid

- Level: error
- Kind: documented
- Looks at: a cell of a date column that is not a date, or names a day that does not exist, or is written as a date of the United States; the date of the event is a key data element.
- Cannot see: It accepts YYYY-MM-DD and a day with a time and a time zone. It does not accept a date written the American way, even when it could only be read one way, because it cannot tell the month from the day in general. It cannot tell whether a valid date is the right one.
- What to change: Write the date as YYYY-MM-DD: four digits for the year, two for the month and two for the day.
- Points of the rule:
  - Every event the subpart lists asks for the date it took place: the date of harvesting, cooling, receiving, shipping, initial packing, landing or completion of the new product. (21 CFR 1.1325 to 1.1350)

## quantity-unit-missing

- Level: error
- Kind: documented
- Looks at: a quantity with no unit of measure, or a unit of measure with no quantity; the rule asks for the quantity and the unit together.
- Cannot see: It compares the quantity and unit columns of one row as a pair, for the quantity, the received quantity and the input quantity. It does not know a unit of measure from a word that is not one.
- What to change: Give the unit of measure with the quantity, such as cases, pounds or kg, and the quantity with the unit.
- Points of the rule:
  - Every event the subpart lists asks for the quantity and the unit of measure together, with examples such as bins, cases, tanks, pounds and kilograms, so a number alone is not the element. (21 CFR 1.1325 to 1.1350)

## quantity-not-positive

- Level: error
- Kind: best practice
- Looks at: a quantity that is not a plain positive number: zero, negative, with a thousands separator, with an exponent or text.
- Cannot see: It reads digits only, up to 40 before and after the point, with BigInt. It does not accept 1,000 or 1e3, and it does not read a quantity written with its unit in one cell.
- What to change: Write the quantity as a plain number above zero, such as 25 or 12.5, with no unit in the cell.
- Points of the rule: none; this check is the tool's own choice.
- The tool's own choice: asking for a positive plain number is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks for a quantity and says nothing about how it is written, but a quantity of zero or one that is text cannot be added up or compared

## future-date

- Level: error
- Kind: best practice
- Looks at: a date later than the moment given with --now (a day alone is allowed one day more, for the time zones of the world); without --now the check does not run.
- Cannot see: A day alone gets one day of room; a date with a time and a time zone is compared with the moment. The tool reads no clock, so without --now nothing is compared, and the report and a note say so.
- What to change: Correct the date or the clock of the system that wrote it; an event cannot be recorded before it took place.
- Points of the rule: none; this check is the tool's own choice.
- The tool's own choice: refusing a date from the future is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule sets none, and the tool reads no clock, so the moment is the one given with --now

## dates-out-of-order

- Level: warning
- Kind: best practice
- Looks at: the dates of one row come in the wrong order: harvest_date, cooling_date, receipt_date and event_date should not go back.
- Cannot see: It compares dates by day, in the order harvest, cooling, receipt, event, using the ones that are filled and valid in the row. It cannot compare the dates of different rows of one lot.
- What to change: Check each date against the business record; food cannot be received before it is harvested or packed before it is received.
- Points of the rule: none; this check is the tool's own choice.
- The tool's own choice: comparing the dates of a row this way is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks for each date and does not say how they relate, but food moves forward through its events

## receiving-without-shipping

- Level: info
- Kind: best practice
- Looks at: a receiving row whose lot code is not shipped by any shipping row of the file; a note, because a file of one firm holds the receipts of food shipped by others.
- Cannot see: It matches by the lot code as written and does not compare the places, the dates or the quantities of the two rows. The rows of other firms are not in the file, which is why this is a note.
- What to change: If the file is meant to hold both sides of the move, add the shipping row or correct the lot code; if it holds one firm, no change is needed.
- Points of the rule: none; this check is the tool's own choice.
- The tool's own choice: matching a receipt with a shipment is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks each firm to keep its own records and does not ask for the two sides in one file, so this is a note

## shipping-without-receiving

- Level: info
- Kind: best practice
- Looks at: a shipping row whose lot code is not received by any receiving row of the file; a note, because the recipient keeps its own records.
- Cannot see: It matches by the lot code as written and does not compare the places, the dates or the quantities of the two rows. The rows of other firms are not in the file, which is why this is a note.
- What to change: If the file is meant to hold both sides of the move, add the receiving row or correct the lot code; if it holds one firm, no change is needed.
- Points of the rule: none; this check is the tool's own choice.
- The tool's own choice: matching a shipment with a receipt is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks each firm to keep its own records and does not ask for the two sides in one file, so this is a note

## received-more-than-shipped

- Level: warning
- Kind: best practice
- Looks at: the receiving rows of a lot code add up to more than the shipping rows of the same lot code in the same unit of measure.
- Cannot see: It matches a lot code and a unit of measure written alike in any case; a lot shipped in cases and received in pallets is not compared. The rows of other senders are not in the file, so a lot that two firms sent may be reported.
- What to change: Check the quantity and the unit of the receiving row named, and whether a shipping row of that lot is missing from the file.
- Points of the rule: none; this check is the tool's own choice.
- The tool's own choice: adding up the quantities of a lot is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule says nothing about how much may be received, but a lot cannot arrive in a larger amount than was sent, and a file that holds only some of the shipments can show this by mistake

## made-from-unknown-lot

- Level: warning
- Kind: best practice
- Looks at: a row for making a new product names an input lot code that no row of the file holds.
- Cannot see: It matches the input lot code with the lot code of any row of any kind of event. It does not check that the input arrived before it was used, or that enough of it was left.
- What to change: Check the input lot code against the record of the receipt, or add the row that holds it; the input lot should be received, packed or made earlier in the file.
- Points of the rule: none; this check is the tool's own choice.
- The tool's own choice: following an input lot back to a row is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule asks for the input lot codes and does not ask that the file holds the row that explains each one, and a file that holds only some of the records can show this by mistake

## duplicate-row

- Level: warning
- Kind: best practice
- Looks at: a row whose cells are all the same as an earlier row, which counts one event twice.
- Cannot see: It compares all the cells of a row after trimming them. Two rows that differ in a cell that should not differ, such as a reference document number, are not seen as repeats.
- What to change: Delete the repeated row, or correct the cell that should differ.
- Points of the rule: none; this check is the tool's own choice.
- The tool's own choice: looking for repeated rows is a best practice of this tool, not a rule of 21 CFR Part 1 Subpart S; the rule does not mention them, but a repeated row doubles the quantity of a lot
