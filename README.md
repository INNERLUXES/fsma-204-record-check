# fsma-204-record-check

FSMA 204 record check. Give it an FDA "electronic sortable spreadsheet" of food traceability records, as CSV or TSV: a
header row and one row for each critical tracking event of 21 CFR Part 1 Subpart S (harvesting, cooling, initial packing,
first land-based receiving, shipping, receiving, and making a new product from a food). It lists, with the line of the
cell, the records that would not satisfy the rule: an event that is none of the seven kinds, a key data element the
section of the rule lists for that kind of event that is empty (the traceability lot code, the product description, the
quantity and unit of measure, the location descriptions of the right parties, the dates, the reference document type and
number), a lot code assigned at an event where the rule says not to establish one, a date that does not exist or lies
after `--now`, a quantity that is not above zero or has no unit, a lot received in a larger amount than was shipped, a
receipt with no shipment and a shipment with no receipt, an input lot of a new product that no row holds, and a row
written twice. Every finding has its id, level, message and line, and the run exits with a code a pipeline can act on.

**It is an input to a review of traceability records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA
certification, and not a guarantee that the records are true or that a firm meets the rule.** It reads one file only: it
contacts nothing over the network, runs nothing, needs no key, reads no clock and writes nothing, so it does not know
whether a food is on the Food Traceability List, whether a firm is exempt, whether a location description is a real
place, or what the rest of the records of a firm hold; the checks are a heuristic. A clean run means only that none of the
problems of its checks were found in the file, and the firm still has to decide what its records mean and what it has to
keep and provide.

When FDA asks for the records of a food during an outbreak or a recall, a firm has 24 hours to give them in an electronic
sortable spreadsheet (21 CFR 1.1455). A spreadsheet that is built in a hurry from three systems tends to have the same
holes: a shipping row with no lot code source, a receiving row with no reference document number, a date written the
other way round, a quantity with no unit, a lot code that shows up at shipping out of nowhere. This tool reads the
spreadsheet on every change and points at the cell, before anyone outside the firm reads it.

- **One check per problem.** Twenty-one checks, each with what it looks at, what it cannot see, the section of the rule it
  rests on and what to change. Seven are documented by a named section of 21 CFR Part 1 Subpart S; eight are best
  practices of this tool; six are about the file itself. Each message says which.
- **The sections, element by element.** For each of the seven kinds of event the tool holds the key data elements that
  the section lists (1.1325, 1.1330, 1.1335, 1.1340, 1.1345 and 1.1350), and a finding names the paragraph, such as
  1.1340(a)(5), the place the food was shipped from.
- **A reader of its own.** The CSV and TSV reader keeps the line and column of every cell, follows quotes and line ends
  inside a cell, and refuses what it cannot follow instead of guessing. A row with the wrong number of cells is a finding
  and is left out of the other checks; it is never taken for a row that is fine.
- **Never a secret.** The tool needs no private key, no seed and no API key. A column named for a private key or a seed, and
  a cell shaped like a mnemonic, an extended private key, a private key in hex or a key in WIF, is an error, and the value
  is never shown in any report.
- **Dates and quantities as written.** A date is read from its characters with a calendar worked out by hand, never
  through the clock or the locale of the machine. A quantity is read from its characters with BigInt, never through a
  floating point number, so lots add up exactly. The one moment the tool is given is the one of `--now`.
- Reports as text, markdown, JSON and SARIF, with an exit code for a pipeline: `0` no finding at or above the `--fail-on`
  level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no clock and no network.

```
npm test
```

```
tests 148
pass 146
fail 0
skipped 2
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link or a device (a link to a records file, and `/dev/null` named as a file); they are guarded with
`process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs the same tests
with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/fsma-204-record-check.git
cd fsma-204-record-check
node bin/fsma-204-record-check.js examples/bad/records.csv --now 2101-03-10T12:00:00Z
```

Or without a clone, in your own project:

```
npx --yes github:INNERLUXES/fsma-204-record-check records.csv --now 2101-03-10
```

Give `--now` the day or the moment the file is checked, such as the time your pipeline starts. A day is written
`YYYY-MM-DD`; a moment is written `YYYY-MM-DDThh:mm:ss` with a time zone, `Z` or `+hh:mm`.

`examples/` holds two made-up spreadsheets. Every business, address and phone number in them is made up (the phone
numbers are of the range that is kept for fiction), and every date is in the made-up year 2101, so no date in the
repository reads as a day something happened. The bad file, in `examples/bad`, holds a mistake of every check but
`file-unreadable`, which fires only on a file the reader cannot follow: no `harvester_contact` column, a column
`harvest_dat` that is a misspelt `harvest_date_range`, and the event date twice; a harvest that holds a lot code, a date
written the American way and no growing area; a cooling of zero bins with no reference document number; an event typed
"Shiping"; an initial packing with the product description "n/a", a quantity with no unit and a receipt dated before the
harvest; a lot shipped under a code no row assigns; a lot received and never shipped, and one received in a larger amount
than was shipped; a seed phrase in a product description; a new product made from a lot no row holds; a row written twice;
a row of four cells; and a shipping dated after `--now`. The good file, in `examples/good`, passes at error, warning and
info level: a lot of romaine harvested, cooled, packed, shipped to a distributor, received, shipped on to a store and
received, two lots packed from food bought from a person the subpart does not cover, a snack cup made from them in two
input rows, shipped and received, and a lot of fish landed.

## Usage

```
fsma-204-record-check <records.csv> [options]
```

```
--format <name>            text, markdown, json or sarif (default: text)
--json                     the same as --format json
--min-severity <level>     the lowest level of a finding that is shown: info, warning, error (default: info)
--fail-on <level>          the lowest level of a finding that fails the run: info, warning, error (default: error)
--now <date>               the moment to compare dates with, written YYYY-MM-DD, or YYYY-MM-DDThh:mm:ss with a time
                           zone, Z or +hh:mm; without it future-date does not run
--explain                  show the sections of the rule behind each finding (text, markdown and JSON)
--list-checks              list the checks with their level and kind, and exit
--help                     show the usage
--version                  show the version
```

[docs/inputs.md](docs/inputs.md) lists every column the tool reads, with the values of `event_type` and a short file. The
path in the report is relative to the folder you run the command in, with forward slashes on every system, followed by
the line. "Row 5" in a message is the fifth row after the header; the line of its cell is the one after the path.

The report of the bad example starts with what was read, the findings in one line, and the checks with the number of
findings of each; then the findings, errors first, each with what to change:

```
fsma-204-record-check: examples/bad/records.csv
file: examples/bad/records.csv (CSV, 13 lines, 3,677 bytes)
rows: 11 (1 harvesting, 1 cooling, 1 initial packing, 3 shipping, 3 receiving, 1 making a new product and 1 no known kind); 1 row left out as malformed
columns: 31 in the header, 29 read, 1 not read
lots: 7 traceability lot codes
event dates: from 2101-03-04 to 2101-04-20
now: 2101-03-10T12:00:00Z, from --now
findings: 21 (11 error, 8 warning, 2 info)

Checks (21)

  check                           level    kind           findings
  file-unreadable                 error    input          0
  column-missing                  error    input          1
  column-unknown                  warning  input          1
  column-duplicate                error    input          1
  row-malformed                   error    input          1
  secret-in-file                  error    input          1
  event-type-unknown              error    documented     1
  kde-missing                     error    documented     2
  kde-conditional-missing         warning  documented     1
  lot-code-at-harvest-or-cooling  warning  documented     1
  lot-code-new-at-shipping        warning  documented     1
  date-invalid                    error    documented     1
  quantity-unit-missing           error    documented     1
  quantity-not-positive           error    best practice  1
  future-date                     error    best practice  1
  dates-out-of-order              warning  best practice  1
  receiving-without-shipping      info     best practice  1
  shipping-without-receiving      info     best practice  1
  received-more-than-shipped      warning  best practice  1
  made-from-unknown-lot           warning  best practice  1
  duplicate-row                   warning  best practice  1
```

A finding names its check, its level, the line of the cell and what to change. With `--explain` it also gives the sections
of the rule behind it and, for a best practice check, the tool's own choice:

```
  WARNING  lot-code-new-at-shipping        examples/bad/records.csv:6
           Row 5 (shipping) names the place it ships from as the source of the lot code LOT-Z9, but no row of the file assigns that lot code, and 21 CFR 1.1320(b) says not to establish a new lot code when shipping.
           fix: Ship the food under the lot code it already has, and add the row of the event that assigned it; if the lot code came from elsewhere, name that place as the lot code source.
           basis: Except where the subpart says otherwise, a firm does not establish a new traceability lot code for any other activity with a listed food, and the rule names shipping as an example. (21 CFR 1.1320(b), https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S)
           basis: A firm assigns a traceability lot code in three cases: when it initially packs a raw agricultural commodity, when it is the first land-based receiver of a food from a fishing vessel, and when it makes a new product from a food. (21 CFR 1.1320(a), https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S)
```

After the findings comes the table of event types, with the rows and the lot codes of each:

```
Event types (7)

  event type            rows  lot codes
  harvesting            1     1
  cooling               1     0
  initial packing       1     1
  shipping              3     2
  receiving             3     2
  making a new product  1     1
  no known kind         1     0

```

The end of the report holds the notes, if any, the notice and the result:

```
This report is an input to a review of traceability records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA certification, and not a guarantee that the records are true or that a firm meets the rule.

RESULT: FAIL - 11 findings at or above error (11 error, 8 warning, 2 info)

```

The good example passes:

```

Event types (7)

  event type                  rows  lot codes
  harvesting                  1     0
  cooling                     1     0
  initial packing             3     3
  first land-based receiving  1     1
  shipping                    3     2
  receiving                   3     2
  making a new product        2     1

This report is an input to a review of traceability records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA certification, and not a guarantee that the records are true or that a firm meets the rule.

RESULT: PASS - no finding at or above error

```

## How the file is read

1. The path is resolved against the folder you run the command in. A link, a folder, a device or a file over 16 MB is
   refused, and so is a file that is not UTF-8 (or UTF-16 with a byte order mark) or holds a null byte, with exit code
   `2` and no report.
2. The file is read as CSV, or as TSV when the first line has tabs, whatever its name. The reader keeps the line and
   column of every cell, follows double quotes (a quote inside a cell is written as two) and a line end inside a quoted
   cell, and refuses a quote that is never closed, text after a closing quote, a cell over 20,000 characters and a file
   of more than 3,000,000 cells. A first line separated by semicolons is refused with a message, not guessed at.
3. Every column name and every cell is looked at for a private key or a seed. One that is found is an error at its line,
   and its value is left out of everything that follows and never shown.
4. The header is read: a column is found by its name written in any case with any separators, so "Traceability Lot Code"
   and `traceability_lot_code` are one column. A column the tool does not read is a `column-unknown` finding, a name
   written twice is `column-duplicate`, and a column the rows need that is not there at all is reported once as
   `column-missing`.
5. Each row is checked on its own: its kind of event, its dates, its quantities and the key data elements that the
   section of the rule lists for that kind. A cell that holds only `n/a`, `none`, `null`, `tbd`, `unknown`, a dash or a
   question mark is read as empty. Then the rows are checked together: lot codes, shipments and receipts, quantities of a
   lot and input lots.

[docs/method.md](docs/method.md) says what each check reads, and [docs/inputs.md](docs/inputs.md) lists the columns.

## What it checks

| Check | Level | Kind | What it reports |
| --- | --- | --- | --- |
| `file-unreadable` | error | input | the file is not a table the reader can follow (a quote never closed, text after a closing quote, a cell too long, semicolons for commas), holds no event_type column or holds a header and no rows, so nothing in it was checked |
| `column-missing` | error | input | a column that the rows of a kind of event need is not in the header at all, so the element cannot be given in any of those rows; it is reported once, at the header, and not for each row |
| `column-unknown` | warning | input | a column the tool does not read, often a misspelt name; nothing under it was checked |
| `column-duplicate` | error | input | two columns of the header have the same name once case and separators are ignored; only the first is read |
| `row-malformed` | error | input | a row with more or fewer cells than the header, which usually means a comma that is not in quotes; the row was left out of every other check |
| `secret-in-file` | error | input | the file holds a private key, a seed or a mnemonic, under a column named for one or as a cell shaped like one; the tool never reads it and never shows it |
| `event-type-unknown` | error | documented | an event_type that is empty or is none of the seven critical tracking events of 1.1310: harvesting, cooling, initial packing, first land-based receiving, shipping, receiving and making a new product ("transformation" in the file); the row was left out of the element checks |
| `kde-missing` | error | documented | a key data element that the section of the rule lists for the kind of event is empty or a placeholder such as n/a: the lot code, the product description, the quantity and unit, a location description of the right party, a date, the reference document type or number, and for making a new product the inputs; the message names the section |
| `kde-conditional-missing` | warning | documented | the field, growing area or container of a harvest or an initial packing is empty; the rule asks for it for produce and for aquacultured food, and the file does not say which food the row is about |
| `lot-code-at-harvest-or-cooling` | warning | documented | a row for harvesting or cooling holds a traceability lot code, though the rule assigns one at initial packing, first land-based receiving or making a new product, and sets no lot code for other activities |
| `lot-code-new-at-shipping` | warning | documented | a shipping row names the shipping location as the lot code source, but no row of the file assigns that lot code (initial packing, first land-based receiving, making a new product, or receiving); the rule says not to establish a new lot code when shipping |
| `date-invalid` | error | documented | a cell of a date column that is not a date, or names a day that does not exist, or is written as a date of the United States; the date of the event is a key data element |
| `quantity-unit-missing` | error | documented | a quantity with no unit of measure, or a unit of measure with no quantity; the rule asks for the quantity and the unit together |
| `quantity-not-positive` | error | best practice | a quantity that is not a plain positive number: zero, negative, with a thousands separator, with an exponent or text |
| `future-date` | error | best practice | a date later than the moment given with --now (a day alone is allowed one day more, for the time zones of the world); without --now the check does not run |
| `dates-out-of-order` | warning | best practice | the dates of one row come in the wrong order: harvest_date, cooling_date, receipt_date and event_date should not go back |
| `receiving-without-shipping` | info | best practice | a receiving row whose lot code is not shipped by any shipping row of the file; a note, because a file of one firm holds the receipts of food shipped by others |
| `shipping-without-receiving` | info | best practice | a shipping row whose lot code is not received by any receiving row of the file; a note, because the recipient keeps its own records |
| `received-more-than-shipped` | warning | best practice | the receiving rows of a lot code add up to more than the shipping rows of the same lot code in the same unit of measure |
| `made-from-unknown-lot` | warning | best practice | a row for making a new product names an input lot code that no row of the file holds |
| `duplicate-row` | warning | best practice | a row whose cells are all the same as an earlier row, which counts one event twice |

A documented check names the section of the rule in its message and in `--explain`. A best practice check says in its
message that it is this tool's own choice, and why it is not a rule of the subpart. [docs/rules-and-sources.md](docs/rules-and-sources.md)
lists every check with what it cannot see.

## What is not checked

- Whether a food is on the Food Traceability List, or whether a firm is covered by the rule or exempt from it. The file
  does not say, and the tool does not guess.
- Whether a location description is complete. The rule defines it as the business name, phone number, address and city,
  State and zip code, or the same abroad; the tool checks that the cell is not empty, not what is written in it.
- Whether a lot code, a phone number or a document number is real, or whether the document it names exists.
- The extra elements that 21 CFR 1.1330(b) lists for sprouts, and the record keeping and providing duties that are not
  about the content of a row: the traceability plan, retention for two years, the 24 hours, the English translation.
- The rows of other firms. A file of one firm holds its receipts and its shipments, not the other side of each, which is
  why a receipt with no shipment is a note and not an error.
- Whether the records are true. A clean report is not a statement that the food is where the file says.

## Formats

`--format text` (the default) is for a terminal. `--format markdown` is for a job summary or a pull request and escapes
what markdown gives a meaning to. `--json` (or `--format json`) gives one object with the file, the rows read, the
totals, every check with its number of findings, every finding with its id, level, kind, line, column, message, fix and
subject, the notes and the result; `--explain` adds the basis of each finding. `--format sarif` gives SARIF 2.1.0 for code
scanning, with one result for each finding and its line and column. `--list-checks` lists the checks in text, markdown or
JSON. The saved output of both examples in all four formats is in `examples/output`.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | no finding at or above the `--fail-on` level (default `error`) |
| `1` | a finding at or above the `--fail-on` level |
| `2` | a usage error, or an input the tool cannot read at all (no result) |

A finding below `--min-severity` is not shown but still counts for the result.

## Limits

The file is read whole, up to 16 MB, 250,000 rows, 200 columns, 3,000,000 cells and 20,000 characters in a cell; more rows
than the limit are left out with a note. At most 1,000 findings of one check are listed, and the rest are counted and
noted. The checks across rows use maps, so one lot code in a hundred thousand rows stays linear. [docs/limits.md](docs/limits.md)
says what the tool cannot see.

## Architecture

| File | What it does |
| --- | --- |
| `src/files.js` | the bounded reading of the file: a regular file, no link, UTF-8 or UTF-16 |
| `src/csv.js` | the CSV and TSV reader with the line and column of every cell |
| `src/secrets.js` | the search for private keys and seeds in column names and cells |
| `src/fields.js` | the columns, the seven kinds of event and the key data elements of each section |
| `src/dates.js`, `src/time.js` | dates read from their characters, with a calendar worked out by hand |
| `src/decimal.js` | exact decimal numbers with BigInt |
| `src/analyze.js` | the checks, row by row and across rows |
| `src/rules.js`, `src/data.js` | the checks with their levels and fixes, and the points of the rule |
| `src/check.js`, `src/report.js`, `src/cli.js` | a run, the four formats and the command line |

## Where the facts come from

The documented checks rest on 21 CFR Part 1 Subpart S, read from
<https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-S>: the definitions of 1.1310, the lot code
sections 1.1320, the records of 1.1325 (harvesting and cooling), 1.1330 (initial packing), 1.1335 (first land-based
receiving), 1.1340 (shipping), 1.1345 (receiving) and 1.1350 (making a new product), and 1.1455 (the sortable
spreadsheet). A text copy of those sections is kept in [research/sources](research/sources), read with curl and no
browser, and [research/sources.md](research/sources.md) says what the rule says and what it does not say. The points the
reports show are written in this project's own words in `src/data.js`.

## Background

This tool is one of the small open source checks that INNERLUXES publishes next to its work on traceability software. If
you are planning a system that records these events, on a shared ledger or in a database, the page
[Blockchain Food Traceability Software Development Services](https://innerluxes.dev/blockchain/food-supply-chain)
describes that work.

## License

MIT. See [LICENSE](LICENSE).
