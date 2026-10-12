# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

Every row of a traceability spreadsheet carries a date: when the food was harvested, cooled, packed, shipped or received.
The tool has to read these dates, compare them with each other and, where it is asked to, with the day the file is
checked. It does not need the clock of the machine to do so. The mistakes in the dates are mistakes in the file (a day
that does not exist, a date written so that the month and the day swap, a receipt dated before the harvest). The one check
that needs a moment from outside, a date later than the day it is checked, can be given that moment.

Reading the clock would make the same file give a different report on a different day. Reading the time zone or the
locale of the machine through the date functions of the platform would make the same text name another day on another
machine, and the order of month and day depends on the locale.

## Decision

1. The tool reads no clock, no time zone of the machine and no locale. It never prints the current time. The same file
   and the same options give the same output on every machine and on every day.
2. Dates are read from their characters (`src/dates.js` on the calendar of `src/time.js`) into the day, and where a time
   and a zone are given the nanosecond, they name, with a calendar worked out by hand: the proleptic Gregorian calendar,
   counted from the start of the Unix epoch, with BigInt. The date functions of the platform are not used, and a test
   fails if src names them. A date is written `YYYY-MM-DD`; a date written the American way is refused, because it is
   ambiguous.
3. The one moment from outside is the one of `--now`, written by the person or the pipeline that runs the tool. Without it,
   `future-date` does not run, and the report says so in its head and in a note. A day alone is allowed one day more than
   the day of `--now`, because the time zones of the world span more than a day.
4. A date is shown as the file writes it, never in another zone or format.
5. No document, test or source file of this repository holds a date or a number that reads like a year in its prose:
   not the licence, not the changelog, not the documents, not the comments of the code. `npm run check` and a test fail on
   any word of four digits that starts with 19 or 20. The examples, the tests and the documents that show a record need
   dates, and every one of them is a made-up date in the year 2101, which the check passes over and no one reads as a day
   something happened; a test checks that every full date of the repository outside the saved copy of the rule is in that
   year. The saved copy of the rule under research/sources is the rule's own words and is kept whole; it holds one number
   that reads like a year, the baseline year of an inflation adjustment in 1.1455, so the check does not read that folder
   for years, for the list of plain words or for the names of tools. Every other check reads it.
6. A version, a count, a number of seconds or the number of a rule is not a year and is not caught: 1.0.0, Node 22, 21 CFR
   1.1340, 846,000 seconds, SARIF 2.1.0 and NIST SP 800-218 hold no year. A test of test/repo.test.js runs the pattern over
   such values and checks that none of them is caught, and that a year in the same place still is.
7. The rule is named with an address that holds no year, and the notes on it name no publication date.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change.
- A file can be checked again later with the `--now` of the first check and gives the same report.
- A pipeline that wants `future-date` passes its own time; the tool never decides what "now" is.
