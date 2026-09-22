// Diagnostic helper: prints every table in the public schema, so we can
// confirm which migrations have actually landed on the live database
// without relying on the Supabase SQL Editor.
import { Client } from 'pg';

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
);
console.log(`${rows.length} table(s) in public schema:`);
for (const row of rows) console.log(` - ${row.table_name}`);
await client.end();
