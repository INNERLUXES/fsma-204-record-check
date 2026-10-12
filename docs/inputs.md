# Inputs

The tool takes the path of one file: an FDA "electronic sortable spreadsheet" of traceability records, saved as CSV or
TSV, with a header row and one row for each critical tracking event of 21 CFR Part 1 Subpart S. There is no
configuration file of the tool itself, no environment variable and no standard input; the options are on the command
line. The tool never asks for a private key, a seed, an API key or the address of a server, and needs none. Its result is
an input to a review of traceability records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA
certification, and not a guarantee that the records are true or that a firm meets the rule.

```
fsma-204-record-check <records.csv> [--format text|markdown|json|sarif] [--json] [--min-severity <level>]
                      [--fail-on <level>] [--now <date>] [--explain] [--list-checks]
```

| Option | Meaning |
| --- | --- |
| `--format <name>` | `text` (default), `markdown`, `json` or `sarif` |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | the lowest level shown: `info` (default), `warning` or `error` |
| `--fail-on <level>` | the lowest level that fails the run: `info`, `warning` or `error` (default) |
| `--now <date>` | the moment dates are compared with, written `YYYY-MM-DD` or `YYYY-MM-DDThh:mm:ss` with a time zone, such as `2101-03-10T12:00:00Z`; without it `future-date` does not run |
| `--explain` | add the sections of the rule behind each finding to the text, markdown and JSON reports |
| `--list-checks` | list the checks with their level and kind, in text, markdown or JSON, and exit |
| `--help`, `--version` | the usage, the version |

Every option that takes a value takes it once. A value may not start with `--`. `-` (standard input) and an address such
as `https://...` are refused. A folder is refused: name the file. Two files are a usage error. A `--now` that is not a
date, or names a day that does not exist, is a usage error with exit code `2`.

## The file

The file is read as CSV, or as TSV when its first line has tabs and at least as many tabs as commas (outside quotes),
whatever its name. It is UTF-8, with or without a byte order mark, or UTF-16 with a byte order mark, with LF, CRLF or CR
line ends. A cell that holds a comma, a tab, a quote or a line end is written in double quotes, and a quote inside it as
two quotes. A line with nothing on it is skipped. A first line separated by semicolons is refused.

The first line is the header. A column is found by its name written in any case with any run of other characters in
place of the underscores, so `Traceability Lot Code`, `traceability-lot-code` and `traceability_lot_code` are one
column. A column the tool does not read is reported and its values are left out; a name written twice is reported and
only the first is read. The order of the columns does not matter. The rule does not fix the names or the order of the
columns of the spreadsheet; these are the tool's own.

Every row after the header is one critical tracking event. "Row 3" in a message is the third row after the header, and
the line of its cell is the one after the path. A row with more or fewer cells than the header is reported and left out
of the other checks.

A cell that is empty, or holds only `n/a`, `na`, `none`, `null`, `nil`, `tbd`, `unknown`, a dash, two dashes or a
question mark (in any case), says nothing, and is read as empty. White space around a cell is dropped.

## The kinds of event

The `event_type` column holds one of these values, in any case with spaces, hyphens or underscores in place of the
underscores (`Initial Packing` and `initial-packing` are `initial_packing`).

| Value | The event | Elements listed in |
| --- | --- | --- |
| `harvesting` | harvesting a raw agricultural commodity | 1.1325(a)(1) |
| `cooling` | cooling before initial packing | 1.1325(b)(1) |
| `initial_packing` | initial packing of a raw agricultural commodity | 1.1330(a), or 1.1330(c) when the food came from a person the subpart does not cover |
| `first_land_based_receiving` | the first land-based receiving of a food from a fishing vessel | 1.1335 |
| `shipping` | shipping | 1.1340(a) |
| `receiving` | receiving | 1.1345(a) |
| `transformation` | making a new product from a food; the rule calls it by this word | 1.1350(a) |

A row of initial packing is read with the shorter list of 1.1330(c) when it names a previous source
(`previous_source_location`) and no farm (`farm_location`), and with the list of 1.1330(a) otherwise.

Making a new product has one row for each input lot. All the rows of one new lot repeat the columns of the new lot
(`traceability_lot_code`, `product_description`, `quantity`, `unit_of_measure`, `event_date`, `event_location` and the
reference document) and differ in the `input_` columns. A row with no `input_` cell at all is a new product with no
input on the Food Traceability List, and no input is asked for.

## The columns

| Column | What it holds |
| --- | --- |
| `event_type` | the kind of event of the row (above) |
| `traceability_lot_code` | the traceability lot code of the food of the row; for making a new product, the new lot |
| `product_description` | the product name, brand, variety, packaging size and style |
| `commodity` | the commodity (and variety) of a raw agricultural commodity |
| `variety` | the variety, when it is kept apart from the commodity; not asked for |
| `species` | the species or acceptable market name of an unpackaged food from a fishing vessel; stands in for the product description in `first_land_based_receiving` |
| `quantity`, `unit_of_measure` | the quantity of the food of the row, and its unit (bins, cases, pounds, kg) |
| `received_quantity`, `received_unit_of_measure` | initial packing: the quantity of the food received |
| `event_date` | the date of the event: harvesting, cooling, initial packing, landing, shipping, receiving or completion |
| `receipt_date` | initial packing: the date the food was received |
| `harvest_date` | initial packing: the date of harvesting |
| `cooling_date` | initial packing: the date of cooling, where it applies; not asked for |
| `harvest_date_range`, `harvest_area` | first land-based receiving: the harvest dates and the fishing areas of the trip |
| `growing_area` | harvesting and initial packing: the field or other growing area (produce) or the container (aquacultured food) |
| `event_location` | the location description of the place where the event took place: where food was cooled, packed, landed, shipped from, received or made |
| `farm_location` | the location description of the farm |
| `cooling_location` | initial packing: where the food was cooled, where it applies; not asked for |
| `subsequent_recipient_location` | the location description of the immediate subsequent recipient, other than a transporter |
| `previous_source_location` | the location description of the immediate previous source, other than a transporter |
| `tlc_source_location`, `tlc_source_reference` | shipping and receiving: the location description of the lot code source, or a reference to it such as a facility registration number or a web address; either one is enough |
| `harvester_contact` | initial packing: the business name and phone number of the harvester |
| `reference_document_type`, `reference_document_number` | the type and number of the reference document: bill of lading, purchase order, invoice, production log |
| `input_traceability_lot_code`, `input_product_description`, `input_quantity`, `input_unit_of_measure` | making a new product: one input lot, its description and the quantity used from it |

In a receiving row of food from a person the subpart does not cover (1.1345(b)), the place of receipt is also the lot code
source: write it in `tlc_source_location` too.

A location description is the business name, phone number, address, and city, State and zip code of the place, or the
same abroad; it is written in one cell. The tool checks that the cell is not empty, not what is in it.

A date is `YYYY-MM-DD`, or a day with a time and a time zone (`2101-03-04T10:30:00Z`). A date written like `03/04/2101`
is refused, because the tool cannot tell the month from the day. A quantity is a plain number above zero with no unit,
sign, separator or exponent, up to 40 digits on each side of the point. Lot codes are compared as written, units of
measure in any case.

Which column each element of each section is read from is in [rules-and-sources.md](rules-and-sources.md) and in every
finding, which names the paragraph, such as 1.1340(a)(5).

### A short file

Two rows that pass every check: a lot shipped and received.

```csv
event_type,traceability_lot_code,product_description,quantity,unit_of_measure,event_date,event_location,subsequent_recipient_location,previous_source_location,tlc_source_location,reference_document_type,reference_document_number
shipping,LOT-1,"Romaine hearts, 3 count, film bag",100,cases,2101-03-03,"Sample Packing House, 555-0122, 40 Cold Storage Lane, Springfield, ST 00002","Example Depot, 555-0133, 7 Freight Way, Rivertown, ST 00003",,"Sample Packing House, 555-0122, 40 Cold Storage Lane, Springfield, ST 00002",bill of lading,BOL-1
receiving,LOT-1,"Romaine hearts, 3 count, film bag",100,cases,2101-03-04,"Example Depot, 555-0133, 7 Freight Way, Rivertown, ST 00003",,"Sample Packing House, 555-0122, 40 Cold Storage Lane, Springfield, ST 00002","Sample Packing House, 555-0122, 40 Cold Storage Lane, Springfield, ST 00002",bill of lading,BOL-1
```

Every made-up business, address and phone number in this repository is fiction, and every date is in the made-up year
2101.
