# 3. Check the records on disk, and contact nothing

## Status

Accepted

## Context

Many facts about a row live elsewhere: whether a food is on the Food Traceability List, whether a firm is covered or
exempt, whether a phone number in a location description rings, whether the supplier really shipped the lot, what the
rest of the records of the lot hold. A check could call a registry, look up every business name, open every web address
in a lot code source reference and ask a partner's system for the other side of every move. That would need the network
and often a key, would make the result depend on the state of other people's services at the moment of the run, would
send the names and addresses of a firm's suppliers and customers to a third party, and would let a file in a pull request
make the pipeline reach any address it names.

What a team needs first, before the spreadsheet is sent to anyone, is a list of what is wrong in it and where: a shipping
row with no lot code source, a date that does not exist, a quantity with no unit, a lot code that shows up at shipping out
of nowhere. The spreadsheet is a file, and can be checked the same way on every run.

## Decision

1. The tool reads the file it is given, and nothing else. It contacts nothing over the network, fetches nothing, opens no
   link, needs no key, runs no program and sends no data anywhere. It cannot write, submit or endorse a record.
2. The checks work from the file alone. The checks across rows see the rows of the file, and docs/limits.md says that the
   rest of the records of a lot are not seen, which is why a receipt with no shipment is a note.
3. The seven kinds of event, the key data elements of each section and the columns that hold them are in the code, kept
   short and named in docs/inputs.md. They change in a release, never while the tool runs, and each rests on the saved copy
   of the section it comes from.
4. The rules the checks apply are listed in docs/method.md, and the sections each documented check rests on are named in
   src/data.js and research/sources.md, each fetched and read before it was listed, with a copy under research/sources. A
   check that no section says is a best practice of this tool and says so.
5. The tool lists what to look at and what to change; it changes nothing and sends nothing.

## Consequences

- The result depends only on the file and the options, and a run needs no network access and no secret.
- A spreadsheet that is fine on its own may still disagree with the records of a partner; the partner, or a later check with
  both sides, has to catch that.
- A location description is checked for being there, never looked up.
