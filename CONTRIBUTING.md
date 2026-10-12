# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux,
Windows and macOS with Node 22 and 24, the tests with coverage, the repository checks, CodeQL, and a secure
development check of the repository itself.

Commit messages in this repository follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`,
with `!` for a breaking change.

This tool reads a spreadsheet of traceability records and runs nothing; its result is an input to a review of
traceability records against 21 CFR Part 1 Subpart S: not legal advice and not an FDA certification, and not a guarantee
that the records are true or that a firm meets the rule. A change must keep it that way: a check reports what the file
holds, and the tool never contacts anything over the network, never writes, submits or signs anything, and never fetches,
opens, runs or evaluates what it reads.

## Never a secret, never real records

The tool never asks for a private key, a seed or an API key, and never looks up a business, a phone number or a lot. Do
not add an option, a column or a test that gives it one: the checks are about the records as written. A test of the
search for secrets builds its values from repeated characters (see test/secrets.test.js), so that no file of the
repository holds anything that could be a real key or seed. Never paste the records of a real firm, a key or a seed into
an issue, a pull request or an example; use made-up businesses, the phone numbers that are kept for fiction and made-up
dates.

## Never legal advice

The rules a documented check applies are the rule's own. A check that is not in the saved sections is a best practice of
the tool and says so. Do not write a message, a document or an example that reads as a statement that a firm meets the
rule, that a spreadsheet would be accepted by FDA, or that the records are true.

## Changing a check

1. Describe the change in docs/method.md first: what the check looks at and what it can and cannot see, and add what it
   cannot see to docs/limits.md and docs/rules-and-sources.md. Where the tool makes its own choice, say so in `own` in
   src/rules.js and in the message, and say why; a check is `documented` only when one of the saved sections says the
   rule.
2. Keep the checks to what is written. A finding must point at something a reader can check in the file: a line and a
   column. Never add a check that needs the network, a registry, a key or the clock.
3. A check says what to change, in `fix` in src/rules.js, and names the points of the rule it rests on in `basis`; a new
   section goes into src/data.js and research/sources.md, is saved as text under research/sources, and is listed in
   docs/rules-and-sources.md. Fetch and read a section before it is listed, and never write a rule you could not read in
   the saved sections as if it were one.
4. A run must never pass because something could not be read: a file that is not a table is an error finding, and a column
   that is missing, unknown or written twice, and a row of the wrong width, is a finding that names it.
5. Add a test with the rows written inline (`table()`, `harvesting()`, `cooling()`, `packing()`, `packingExempt()`,
   `landing()`, `shipping()`, `receiving()`, `making()`, `findingsOf()`, `idsOf()`, `ofCheck()`, `run()` and `cli()` in
   test/helpers.js), small enough to work out by hand, with a near miss on each side: the value that is reported and the
   one next to it that is not.
6. A check id, once released, keeps its meaning: pipelines and other tools read it from the JSON, SARIF and markdown
   output.

## Changing the reader

1. The reader of tables (src/csv.js) keeps its limits (`CSV_LIMITS`) and works through a loop; it has no recursion, and
   neither has the search for secrets (src/secrets.js). The decimal reader (src/decimal.js) keeps `DECIMAL_LIMITS`.
   src/decimal.js, src/time.js, src/files.js and the shapes of src/secrets.js are kept as they are in the sibling tools;
   the only change to what the search reports is made in src/check.js, for the columns of identifiers (decision 2).
2. A quantity is read from the characters of the file into a whole number and a scale with BigInt; a number past the limit
   is a finding, never a guess.
3. A date is read from its characters by src/dates.js on the calendar of src/time.js; the tool never reads the clock and
   never uses the date functions of the platform.
4. A cell marked as a secret is left out as if it were not there; no message may name it.
5. A column that is read is listed in docs/inputs.md and in src/fields.js; a part the file does not give is a finding or a
   note, so that it never goes by unnoticed.
6. No pattern is built from the file or an argument. A test fails when `new RegExp` appears in src outside src/text.js.
7. The checks across rows use maps and never compare every pair; a hostile test with a hundred thousand rows of one lot
   code checks it.
8. A time check in a test widens under coverage: read `process.env.NODE_V8_COVERAGE`, which the test runner sets only when
   coverage is on, and allow four times the time (`allowed()` in test/helpers.js). Run `npm run test:coverage` before you
   open the pull request.
9. A file written with LF, CRLF or CR line ends, as UTF-8 with or without a byte order mark or as UTF-16 with one, must
   give the same findings.

## Changing the rule's points

1. Every point the reports show is in src/data.js, written in this project's own words, with the section it comes from. A
   short phrase of the rule may be named; a long quotation may not.
2. research/sources.md lists the rule with a note on what it says and does not say, research/sources holds a text copy of
   the sections the checks rest on, and docs/rules-and-sources.md lists every check with its points and what to change. A
   test checks them against each other. Never write the date a section was last changed, or a publication date.

## The examples

The files under `examples/` are made-up input for the tool: a spreadsheet that holds a mistake of every check but
`file-unreadable`, and one that passes at error, warning and info level, with made-up businesses, addresses and phone
numbers of the range kept for fiction, dates in the made-up year 2101, and no key and no seed. A change to them goes with
the real output that `npm run example` writes to `examples/output`.

## Tests that depend on the system

A test that depends on the operating system (a symbolic link, a device) is guarded with `process.platform` and says why in
its `skip`. A test never asserts a line number written by hand: a line is worked out with `lineOf()` of test/helpers.js or
from the text itself. Every other test builds its paths with `resolve()` from names with forward slashes, and a test never
writes a backslash, a bar, a star, a question mark or a quote into a file name, because Windows refuses them.

A test never reads the clock, the time zone of the machine or the locale.

## Rules for the code

- No runtime dependencies and no development dependencies. Node 22 or newer and nothing else; the tests use `node:test`.
- The tool reads the file it is given and writes only to standard output and standard error. It opens no network
  connection, opens no link, signs nothing, runs no program and evaluates nothing it reads.
- Text from the input, file names, cells and lot codes included, goes through `safeText` before it reaches the output or
  an error message.
- Source files stay ASCII; write any other character as a Unicode escape, or build it from its code point.
- No file carries a date in its prose, and no file holds a number that reads like a year. Version numbers (Node 22, 1.0.0),
  counts, seconds and the number of a rule (21 CFR 1.1340, SARIF 2.1.0, NIST SP 800-218) are fine; the dates of records in
  the examples, the tests and the documents are in the made-up year 2101 (decision 1).
- Examples and tests use made-up businesses, products and places.
- Plain words in the documents: `npm run check` fails on a short list of words that say little. The rule names one of its
  seven kinds of event with a word of that list; the value of the `event_type` column, written between quote marks or as a
  cell of an example file, is the only use of the list the check passes over.

## Before you open the pull request

```
npm test
npm run test:coverage
npm run check
npm run example
```
