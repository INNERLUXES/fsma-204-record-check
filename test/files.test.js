import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { COLUMN_NAMES, FILE_LIMITS, InputError, checkFile, decode, displayPath, locateInput, readInputText } from '../src/index.js';
import { ARGS, GOOD, cli, clean, run, table, withFiles } from './helpers.js';

test('decode: UTF-8 with and without a byte order mark, and UTF-16 in both byte orders', () => {
  assert.equal(decode(Buffer.from('[]\n')), '[]\n');
  assert.equal(decode(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('"\u00e9"', 'utf16le')])), '"\u00e9"');
  const be = Buffer.from('{"a": 1}', 'utf16le').swap16();
  assert.equal(decode(Buffer.concat([Buffer.from([0xfe, 0xff]), be])), '{"a": 1}');
});

test('decode: the byte order mark of UTF-8 is dropped', () => {
  assert.equal(decode(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])), '{}');
});

test('decode: a null byte, bytes that are not UTF-8, an odd number of UTF-16 bytes and a lone UTF-16 surrogate are refused', () => {
  assert.throws(() => decode(Buffer.from([0x7b, 0x00, 0x7d])), /null byte/);
  assert.throws(() => decode(Buffer.from([0xc3, 0x28])), /not valid UTF-8/);
  assert.throws(() => decode(Buffer.from([0xff, 0xfe, 0x61])), /odd number of bytes/);
  assert.throws(() => decode(Buffer.from([0xff, 0xfe, 0x00, 0xd8])), /not valid UTF-16/);
});

test('displayPath: relative with forward slashes inside the folder, and the whole path outside it', () => {
  const base = resolve('/work/project');
  assert.equal(displayPath(resolve(base, 'batches/records.csv'), base), 'batches/records.csv');
  const outside = resolve(base, '..', 'elsewhere', 'records.csv');
  assert.ok(!displayPath(outside, base).includes('\\'));
  assert.ok(displayPath(outside, base).endsWith('elsewhere/records.csv'));
});

test('locateInput: a file is read; a folder and a missing path are refused', async () => {
  await withFiles({ 'a/records.csv': GOOD['records.csv'] }, async (dir) => {
    assert.equal(await locateInput('a/records.csv', dir), resolve(dir, 'a/records.csv'));
    await assert.rejects(locateInput('a', dir), /is a folder; give the records file/);
    await assert.rejects(locateInput('missing.csv', dir), /does not exist/);
    await assert.rejects(locateInput('a/records.csv/x', dir), /does not exist/);
  });
});

test('an absolute path is used as it is, with resolve() and not a join', async () => {
  await withFiles(GOOD, async (dir) => {
    const r = await cli([resolve(dir, 'records.csv')], process.cwd());
    assert.equal(r.code, 0, r.err);
  });
});

test('a file over the size limit is refused before it is read, and the limit is in the error', async () => {
  await withFiles(GOOD, async (dir) => {
    await assert.rejects(checkFile({ path: 'records.csv', version: '0', base: dir, limits: { maxBytes: 200 } }), (e) => e instanceof InputError && /larger than 200 bytes/.test(e.message));
  });
  assert.ok(FILE_LIMITS.maxBytes >= 1024 * 1024);
});

test('a binary file, and bytes that are not UTF-8, are an input error with exit code 2 and no report', async () => {
  const bin = await run({ 'records.csv': Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]) }, ARGS);
  assert.equal(bin.code, 2);
  assert.match(bin.err, /records.csv: holds a null byte/);
  assert.equal(bin.out, '');
  const bad = await run({ 'records.csv': Buffer.from([0x7b, 0xc3, 0x28, 0x7d]) }, ARGS);
  assert.equal(bad.code, 2);
  assert.match(bad.err, /records.csv: is not valid UTF-8/);
  const none = await run({}, ['a.csv']);
  assert.match(none.err, /a problem:\n {2}a\.csv: does not exist/);
});

test('an empty file, and a file that is not a table, are an error finding, not a pass', async () => {
  const r = await run({ 'records.csv': '' }, ARGS);
  assert.equal(r.code, 1);
  assert.match(r.out, /ERROR {4}file-unreadable +records\.csv:1\n/);
  assert.match(r.out, /The file holds no text to read as a table/);
  assert.match(r.out, /\nrecords: not read\n/);
  const open = await run({ 'records.csv': 'event_type,quantity\nshipping,"5\n' }, ARGS);
  assert.equal(open.code, 1);
  assert.match(open.out, /The file is not a table the reader can follow: The quote that opens the cell was never closed; the file ends inside it\. Nothing in the file was checked\./);
  const header = await run({ 'records.csv': 'event_type,quantity\n' }, ARGS);
  assert.equal(header.code, 1);
  assert.match(header.out, /The file holds a header and no rows/);
});

test('a symbolic link is refused by name, not followed', { skip: process.platform === 'win32' ? 'creating symbolic links needs a privilege on Windows' : false }, async () => {
  await withFiles({ 'real/records.csv': GOOD['records.csv'] }, async (dir) => {
    await mkdir(resolve(dir, 'linked'));
    await symlink(resolve(dir, 'real/records.csv'), resolve(dir, 'linked/records.csv'));
    const r = await cli(['linked/records.csv'], dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /symbolic link/);
  });
});

test('a device is refused as not a regular file', { skip: process.platform === 'win32' ? 'there is no /dev/null on Windows' : false }, async () => {
  const r = await cli(['/dev/null'], process.cwd());
  assert.equal(r.code, 2);
  assert.match(r.err, /not a regular file/);
});

test('readInputText reads a file through a handle and reports its size in bytes', async () => {
  await withFiles({ 'records.csv': '"\u00e9"\n' }, async (dir) => {
    const r = await readInputText(resolve(dir, 'records.csv'), dir);
    assert.equal(r.text, '"\u00e9"\n');
    assert.equal(r.bytes, 5);
  });
});

test('a file with another extension is still read as a table, and a file with tabs as TSV', async () => {
  const r = await run({ 'records.txt': GOOD['records.csv'] }, ['records.txt']);
  assert.equal(r.code, 0);
  assert.match(r.out, /\nfile: records\.txt \(CSV, /);
  const tsv = await run({ 'records.tsv': table(clean(), COLUMN_NAMES, '\t') }, ['records.tsv']);
  assert.equal(tsv.code, 0, tsv.out);
  assert.match(tsv.out, /\nfile: records\.tsv \(TSV, /);
});
