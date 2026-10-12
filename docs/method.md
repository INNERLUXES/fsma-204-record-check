# Method

This document says how the tool reads a spreadsheet of traceability records and what each check looks at. The tool is an
input to a review of traceability records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA
certification, and not a guarantee that the records are true or that a firm meets the rule. A clean run means only that
none of the problems below were found in the file.

## Why the spreadsheet

When FDA asks a firm for its records during an outbreak or a recall, the firm has 24 hours to give the information of the
event sections of the rule in an electronic sortable spreadsheet (1.1455). A spreadsheet put together in a hurry from a
warehouse system, a farm app and a shipping portal tends to have the same holes: an element that one of the systems does
not hold, a date in the wrong form, a quantity with no unit, a lot code that appears out of nowhere at shipping. Most of
these can be seen in the file before anyone outside the firm reads it. The tool reads the file as it is, so the same check
runs on every export, in a pipeline or by hand, and every finding points at a cell.

## Reading the file

1. The path is resolved against the folder the command runs in. A link, a folder, a device or a pipe is refused; a file
   over 16 MB is refused before it is read; a file with a null byte, or bytes that are not UTF-8 (or UTF-16 with a byte
   order mark), is refused with exit code `2` and no report.
2. The file goes to the reader of tables (`src/csv.js`), which keeps the line and column of every cell, follows quotes
   and line ends inside quoted cells, and picks a comma or a tab from the first line. A quote that is never closed, text
   after a closing quote, a quote inside a cell that does not start with one, a cell or a row over the limits, or
   semicolons between the cells is `file-unreadable`; so is a file with no text, no `event_type` column or a header and
   no rows.
3. Every column name and every cell of 47 characters or more is looked at for a key or a seed (`src/secrets.js`). A
   column named for a private key, a seed or a mnemonic, and a cell shaped like a mnemonic, an extended private key, a
   private key in hex or a key in WIF, is `secret-in-file`. The cell is marked and left out of everything that follows,
   and no report shows it. A cell of 64 hex digits in the lot code, input lot code or reference document number column is
   an identifier and not a key.
4. The header is read (`src/fields.js`): a column is found by its name with case and separators ignored. A column the tool
   does not read is `column-unknown`, with the nearest column when one is within two edits; a name written twice is
   `column-duplicate`.
5. Each row is checked on its own, then the rows are checked together, in the order of the file. A row with the wrong
   number of cells is `row-malformed` and is left out of everything else.

## The checks of the file

- A file that cannot be followed as a table (`file-unreadable`).
- A column that the rows need and the header does not have (`column-missing`), reported once at the header with the number
  of rows it affects. Only the columns that the kinds of event in the file need are asked for, so a file of shipping
  and receiving rows is not asked for `harvester_contact`.
- A column the tool does not read (`column-unknown`), a name written twice (`column-duplicate`) and a row with the wrong
  number of cells (`row-malformed`).
- A key or a seed in a column name or a cell (`secret-in-file`).

## The checks of a row

- **The kind of event** (`event-type-unknown`, 1.1310). The `event_type` cell, with case and separators ignored, is one of
  the seven kinds. An empty cell, a placeholder or any other word is a finding with the nearest kind named, and the row is
  left out of the element checks.
- **The key data elements** (`kde-missing`, 1.1325 to 1.1350). For the kind of event, each element the section lists is
  looked up in its cells; an element with two cells (the species or the product description, the lot code source or its
  reference) is given by either one. An element whose cells are all empty or placeholders is a finding that names the
  paragraph (1.1340(a)(5), say) and the cell. For initial packing the list is 1.1330(c) when the row names a previous
  source and no farm, and 1.1330(a) otherwise. For making a new product, the input elements of 1.1350(a)(1) are asked
  for when the row has any `input_` cell. A column that is not in the header at all is not asked for row by row
  (`column-missing`).
- **Elements the rule asks for only where they apply** (`kde-conditional-missing`, 1.1325(a)(1)(v) and (vi), 1.1330(a)(5)
  and (6)). The field, growing area or container is a warning, because the tool cannot tell produce or aquacultured food
  from other food. If the column is not in the header the report says so in a note.
- **Lot codes where the rule does not assign them** (`lot-code-at-harvest-or-cooling`, 1.1320). A lot code in a
  harvesting or a cooling row is a warning.
- **Dates** (`date-invalid`, `future-date`, `dates-out-of-order`). Each non-empty cell of `event_date`, `receipt_date`,
  `harvest_date` and `cooling_date` is read from its characters with a calendar worked out by hand (`src/dates.js`); a
  cell that is not `YYYY-MM-DD` or a day with a time and a zone, or names a day that does not exist, is `date-invalid`.
  With `--now`, a date after it is `future-date`; a day alone gets one day of room. The dates of one row should not go
  back from harvest to cooling to receipt to event.
- **Quantities** (`quantity-unit-missing`, `quantity-not-positive`). For the quantity, the received quantity and the
  input quantity, a quantity without its unit or a unit without its quantity is `quantity-unit-missing`; a quantity that
  is not a plain number above zero is `quantity-not-positive`. Quantities are read with BigInt.

## The checks across rows

- **A new lot code at shipping** (`lot-code-new-at-shipping`, 1.1320(b)). A shipping row that names the place it ships
  from as the source of the lot code, when no row of initial packing, first land-based receiving, making a new product or
  receiving holds that lot code.
- **Receipts and shipments** (`receiving-without-shipping`, `shipping-without-receiving`). A lot code that only one side
  holds. A note.
- **More received than shipped** (`received-more-than-shipped`). For each lot code and unit of measure, the receiving
  rows are added up in file order and compared with the sum of the shipping rows; the row where the sum first passes is
  reported, once.
- **Input lots** (`made-from-unknown-lot`). An input lot code of a row for making a new product that is the lot code of
  no row.
- **Repeated rows** (`duplicate-row`). A row whose cells, trimmed, are all the same as an earlier row's.

Each finding has an id that stays the same once released, a level (`error`, `warning` or `info`), a kind (`documented`,
`best practice` or `input`), its message with the row, the line and the column, and what to change. A documented check
names the section of the rule; a best practice check says that it is the tool's own choice and why.

## The result

The run passes when no finding is at or above the `--fail-on` level (default `error`); a finding below `--min-severity` is
not shown and still counts. A part of the file that could not be read is always a finding, never a pass: a missing column,
an unknown kind of event, a row with the wrong number of cells and a cell that holds a secret each say so.
