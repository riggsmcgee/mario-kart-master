/**
 * Rewrite the quoted scripts in `docs/voiceover-scripts.md` from `src/data/voiceover.ts`.
 *
 *   node scripts/voiceover-doc.mjs           # rewrite in place
 *   node scripts/voiceover-doc.mjs --check   # exit 1 if it is out of date (for CI, later)
 *
 * **Why this exists.** The doc says, in its own header, that a transcript disagreeing with the
 * audio is worse than no transcript — and then the two drifted anyway the first time chapters 0, 5
 * and 6 were rewritten, because the words live in two places and only one of them compiles. This
 * makes the shipped data the single source for the words.
 *
 * **It regenerates the words and nothing else.** Every chapter section in that file carries a
 * hand-written `**Target:**` and `**Tone:**` block — direction for the person at the microphone,
 * which cannot be derived from anything and is the most useful part of the document. Those are
 * preserved exactly; only the `>` block underneath is replaced, and the word count inside the
 * target line is recomputed to match.
 *
 * Placeholders are resolved to the real names here, because this file is read aloud rather than
 * rendered — `{rival}` is templated on the page so the doorman can rename the student, and nobody
 * can say a curly brace.
 */

import { readFile, writeFile } from 'node:fs/promises';

const DOC = 'docs/voiceover-scripts.md';
const SOURCE = 'src/data/voiceover.ts';
const CHAPTERS = 'src/data/chapters.ts';

const NAME = 'Jodi';
const RIVAL = 'Kayla';

const check = process.argv.includes('--check');

/**
 * Pull the VOICEOVER table out of the TypeScript without importing it.
 *
 * A regex over source is usually the wrong tool, and it is the right one here: this script has to
 * keep working when the app does not compile, which is exactly when someone is mid-rewrite of a
 * script. The shape it matches is narrow — `chN: [ ... ],` at two spaces of indent — and it fails
 * loudly below if it finds nothing rather than silently writing an empty document.
 */
function extract(source, pattern) {
  const out = new Map();
  for (const match of source.matchAll(pattern)) {
    out.set(match[1], match[2]);
  }
  return out;
}

const source = await readFile(SOURCE, 'utf8');
const scripts = new Map();

for (const [, id, body] of source.matchAll(/^ {2}(ch\d): \[\n([\s\S]*?)^ {2}\],$/gm)) {
  // Each line is a quoted string. Both quote styles are in use, and escaped apostrophes appear in
  // the single-quoted ones.
  const lines = [...body.matchAll(/^ {4}(['"])([\s\S]*?)\1,$/gm)].map(([, , text]) =>
    text.replace(/\\'/g, "'").replace(/\\"/g, '"'),
  );
  if (lines.length) scripts.set(id, lines);
}

if (scripts.size === 0) {
  console.error(`${SOURCE}: found no scripts — has the shape of VOICEOVER changed?`);
  process.exit(2);
}

// Titles, so a renamed chapter renames its heading too.
const titles = extract(
  await readFile(CHAPTERS, 'utf8'),
  /id: '(ch\d)',[\s\S]*?title: '((?:[^'\\]|\\.)*)'/g,
);

const fill = (text) =>
  text.replace(/\{name\}/g, NAME).replace(/\{rival\}/g, RIVAL).replace(/\\'/g, "'");

/** Markdown blockquote, wrapped at 98 columns to match the rest of the file. */
function quote(lines) {
  const out = [];
  for (const line of lines) {
    const words = fill(line).split(' ');
    let current = '>';
    for (const word of words) {
      if (current.length + word.length + 1 > 98) {
        out.push(current);
        current = '>';
      }
      current += ` ${word}`;
    }
    out.push(current);
    out.push('>');
  }
  // Trailing '>' before the section ends is noise.
  while (out.at(-1) === '>') out.pop();
  return out.join('\n');
}

let doc = await readFile(DOC, 'utf8');
let rewritten = 0;

for (const [id, lines] of scripts) {
  const number = Number(id.slice(2));
  const title = fill(titles.get(id) ?? '');

  // Everything from this chapter's heading to the next `---` separator, or the end of the file.
  // The Target/Tone block inside it is kept verbatim; only the quote is replaced.
  //
  // The terminator is `\n---\n` or true end-of-input — written as `$(?![\s\S])` because this
  // regex needs the `m` flag for the `^>` and under `m` a plain `$` matches at the end of *every
  // line*. The first version of this used `\n*$` and so stopped at the first line of the quote,
  // then wrote the new script in front of the old one and doubled every chapter.
  const section = new RegExp(
    `(## Chapter ${number} — [^\\n]*\\n\\n)([\\s\\S]*?)(^> [\\s\\S]*?)(?=\\n\\n---\\n|$(?![\\s\\S]))`,
    'm',
  );

  const found = section.exec(doc);
  if (!found) {
    console.error(`${DOC}: no section found for Chapter ${number}`);
    process.exit(2);
  }

  const words = lines.reduce((total, line) => total + fill(line).split(/\s+/).length, 0);
  const direction = found[2].replace(
    /\*\*Target:\*\* 60–90 seconds \(~\d+ words\)/,
    `**Target:** 60–90 seconds (~${Math.round(words / 10) * 10} words)`,
  );

  const replacement = `## Chapter ${number} — ${title}\n\n${direction}${quote(lines)}`;
  const next = doc.slice(0, found.index) + replacement + doc.slice(found.index + found[0].length);
  if (next !== doc) rewritten++;
  doc = next;
}

const original = await readFile(DOC, 'utf8');
if (doc === original) {
  console.log(`${DOC} is up to date (${scripts.size} scripts).`);
  process.exit(0);
}

if (check) {
  console.error(`${DOC} is out of date — run: node scripts/voiceover-doc.mjs`);
  process.exit(1);
}

await writeFile(DOC, doc);
console.log(`${DOC}: rewrote ${rewritten} of ${scripts.size} chapter scripts.`);
