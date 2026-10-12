# Changes

## 1.0.0

First release.

- Reads an FDA FSMA 204 electronic sortable spreadsheet of food traceability records (CSV or TSV, a header row and one row
  for each critical tracking event of 21 CFR Part 1 Subpart S) and lists with its line and column every record that would
  not satisfy the rule, as an input to a review: not legal advice and not an FDA certification, and not a guarantee that
  the records are true or that a firm meets the rule. It reads the file, contacts nothing over the network, fetches
  nothing, opens no link, runs nothing, needs no key, follows no symbolic link, reads no clock and writes nothing to disk.
- Reads the seven kinds of critical tracking event of 1.1310 (harvesting, cooling, initial packing, first land-based
  receiving, shipping, receiving and making a new product), thirty-one columns that hold the key data elements of the
  sections 1.1325, 1.1330, 1.1335, 1.1340, 1.1345 and 1.1350, and the shorter list of 1.1330(c) for food packed from a
  person the subpart does not cover. A column is found by its name with case and separators ignored.
- A strict reader of CSV and TSV of its own, with no dependency and no recursion, with the line and column of every cell,
  quotes and line ends inside cells, a comma or a tab chosen from the first line, and limits of rows, columns, cells and
  cell length; the bounded reading of a file, the decimal reader and the calendar of the sibling tools. Quantities are
  read from the characters of the file with BigInt, never through a floating point number, and dates are read from their
  characters with a calendar worked out by hand.
- A search for keys and seeds in every column name and every long cell, with the shapes of the sibling tools: each one
  found is an error whose value is left out of every check and never shown. A cell of 64 hex digits in the column of lot
  codes, input lot codes or reference document numbers is read as an identifier.
- Twenty-one checks in three levels, each documented or a best practice of the tool and saying which: an event type that is
  none of the seven, per 1.1310 (`event-type-unknown`); an element that the section lists for the kind of event and the
  cells leave empty, per 1.1325 to 1.1350 (`kde-missing`, and `kde-conditional-missing` for the growing area); a lot code
  at harvesting or cooling, per 1.1320 (`lot-code-at-harvest-or-cooling`); a new lot code at shipping, per 1.1320(b)
  (`lot-code-new-at-shipping`); a date that does not exist (`date-invalid`); a quantity with no unit or a unit with no
  quantity (`quantity-unit-missing`); a quantity that is not above zero (`quantity-not-positive`); a date after `--now`
  (`future-date`); dates of a row out of order (`dates-out-of-order`); a lot received and never shipped, and shipped and
  never received, as notes (`receiving-without-shipping`, `shipping-without-receiving`); a lot received in a larger
  amount than was shipped (`received-more-than-shipped`); an input lot that no row holds (`made-from-unknown-lot`); a row
  written twice (`duplicate-row`); and six checks about the file (`file-unreadable`, `column-missing`, `column-unknown`,
  `column-duplicate`, `row-malformed`, `secret-in-file`).
- A table of the kinds of event with the rows and lot codes of each, in every format but SARIF.
- Reports as text, markdown, JSON and SARIF 2.1.0; every finding has its id, severity, message, file, line, column and
  subject; `--min-severity`, `--fail-on`, `--now`, `--explain` with the sections of the rule behind each finding, and
  `--list-checks`. Exit code `0` when no finding is at or above the fail-on level, `1` when one is, `2` for a usage or
  input error, with no result.
- A plain text copy of the sections of the rule the documented checks rest on, under research/sources, with a note on
  them.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
