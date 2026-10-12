# Limits

The tool is not legal advice and not an FDA certification, and it is not an audit. It reads a spreadsheet of
traceability records, and its result is an input to a review of traceability records against 21 CFR Part 1 Subpart S:
not legal advice and not an FDA certification, and not a guarantee that the records are true or that a firm meets the
rule. A clean run means only that none of the problems in [method.md](method.md) were found in the file.

## What it cannot see

- **The real world.** It cannot tell whether a food was where a row says, on the day it says, in the amount it says. A
  well formed row about the wrong lot passes.
- **Who is covered.** The file does not say whether a food is on the Food Traceability List, whether the firm is a
  farm, a retailer or a restaurant that the rule treats differently, or whether it is small enough for the rule to
  allow a form other than a spreadsheet. The tool asks for the elements the sections list for every row, and a firm that
  is exempt from some of them will see findings that do not apply to it.
- **What is in a cell.** A location description is checked for being there, not for a phone number, an address or a zip
  code that exists. A product description is not read for a packaging size or style. A lot code, a reference document
  number and a document type are not looked up, and the document is not opened.
- **The other firms.** A file holds the rows of one firm, or of several, as it was built. The receipts of food that
  another firm shipped, and the shipments that another firm received, are not in a file of one firm, which is why
  `receiving-without-shipping` and `shipping-without-receiving` are notes, and why `received-more-than-shipped` and
  `made-from-unknown-lot` can report a lot whose other rows live elsewhere.
- **The lot as a whole.** The tool adds up the quantities of a lot code in one unit of measure. It does not convert
  units, know how many cases are on a pallet, follow a lot that is split or combined under new codes outside the file,
  or know how much of an input lot was left.
- **A receipt from a person the subpart does not cover.** 1.1345(b) makes the place of receipt the lot code source, with
  no separate element for it. The tool asks for the lot code source (or its reference) in every receiving row, so in such
  a row write the receiving place in `tlc_source_location` as well.
- **Sprouts.** The extra elements for sprouts in 1.1330(b), about the seed supply chain, are not checked, and a note says
  so when a row of initial packing names sprouts.
- **Duties that are not about a row.** The traceability plan, keeping records for two years, producing them within 24
  hours, an English translation, and the forms other than a spreadsheet that small firms may use are not checked.
- **The rule's other sections.** The tool was built from the sections named in [research/sources.md](../research/sources.md).
  It did not read the list of foods, the exemptions or the guidance, and does not check them.
- **Time.** Every date is the file's own; the one moment the tool is given is the one of `--now`. A day alone is allowed
  one day more than the day of `--now`, because the time zones of the world span more than a day.
- **What a misspelt column meant.** A column the tool does not read is reported and left out. A misspelt
  `reference_document_number` makes every row look as if it had none (`column-missing`); read the `column-unknown`
  findings first.
- **Every secret.** The search for keys and seeds knows them by the name of their column and by their shape: a mnemonic
  of 12 to 24 lowercase English words, an extended private key, 64 hex digits or a key in WIF. A cell of 64 hex digits in
  the lot code, input lot code or reference document number column is read as an identifier, which cannot be told from
  a private key pasted there; it is never shown. A secret split over cells, encoded another way or written under another
  name is not caught, and API keys and passwords are not looked for by their shape. A clean run does not say that the
  file holds no secret.
- **Spreadsheet formats.** XLSX and XLS are not read: save the sheet as CSV or TSV. A file with semicolons between the
  cells is refused. A formula is read as the text the file holds.

## Size limits

| Limit | Value | What happens past it |
| --- | --- | --- |
| Size of the file | 16 MB | the file is refused before it is read, with exit code `2` |
| Rows | 250,000 | the first are read, and a note says that the rest were left out |
| Columns | 200 | `file-unreadable` at the place |
| Cells | 3,000,000 | `file-unreadable` at the place |
| Length of a cell | 20,000 characters | `file-unreadable` at the place |
| Findings of one check | 1,000 listed | the rest are counted in the totals and in a note |
| Digits of a quantity | 40 on each side of the point | `quantity-not-positive` |

The reader of the table, the search for secrets and the checks work through loops and maps and never recurse; the
checks across rows use maps and never compare every pair of rows. The tests run each limit with hostile input and a time
check.
