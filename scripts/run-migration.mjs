// One-off migration runner used when `supabase db push` / `supabase link` is
// blocked (e.g. a Management API privilege error on the CLI account) and the
// Supabase SQL Editor's paste-as-one-transaction behavior is silently
// rolling back multi-statement migration files on any single error.
//
// Unlike pasting a whole file into the SQL Editor (or sending it as one
// multi-statement query), this runs each top-level SQL statement as its own
// query, so earlier statements stay committed even if a later one fails.
//
// Usage:
//   PGHOST=db.<ref>.supabase.co PGPASSWORD=... node scripts/run-migration.mjs supabase/migrations/0001_core_schema.sql
//
// Connection is read from the standard PG* env vars (PGHOST, PGPORT,
// PGDATABASE, PGUSER, PGPASSWORD) rather than a single connection-string URI,
// so a password containing '@', ':', '/' etc. never needs manual
// percent-encoding.

import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.mjs <path-to-migration.sql>');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');

// Split into top-level statements on ';', respecting:
//  - '...' single-quoted strings ('' is an escaped quote inside one)
//  - "..." double-quoted identifiers
//  - $tag$...$tag$ dollar-quoted bodies (used by function definitions)
//  - -- line comments and /* */ block comments
function splitStatements(text) {
  const statements = [];
  let cur = '';
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (ch === '-' && text[i + 1] === '-') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? n : end + 1;
      cur += text.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      cur += text.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (text[j] === "'" && text[j + 1] === "'") { j += 2; continue; }
        if (text[j] === "'") { j += 1; break; }
        j += 1;
      }
      cur += text.slice(i, j);
      i = j;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') j += 1;
      j = Math.min(j + 1, n);
      cur += text.slice(i, j);
      i = j;
      continue;
    }

    if (ch === '$') {
      const tagMatch = /^\$[a-zA-Z_]*\$/.exec(text.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const closeIdx = text.indexOf(tag, i + tag.length);
        const stop = closeIdx === -1 ? n : closeIdx + tag.length;
        cur += text.slice(i, stop);
        i = stop;
        continue;
      }
    }

    if (ch === ';') {
      cur += ch;
      const trimmed = cur.trim();
      if (trimmed) statements.push(trimmed);
      cur = '';
      i += 1;
      continue;
    }

    cur += ch;
    i += 1;
  }

  const trimmed = cur.trim();
  if (trimmed) statements.push(trimmed);

  return statements;
}

const statements = splitStatements(sql);

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`Connected. Running ${statements.length} statement(s) from ${file}...`);

for (let idx = 0; idx < statements.length; idx += 1) {
  const stmt = statements[idx];
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 90);
  try {
    await client.query(stmt);
    console.log(`[${idx + 1}/${statements.length}] OK  ${preview}`);
  } catch (err) {
    console.error(`[${idx + 1}/${statements.length}] FAILED  ${preview}`);
    console.error(err.message);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log(`Done. ${file} applied successfully.`);
