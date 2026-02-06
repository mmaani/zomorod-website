import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const schemas = await sql`
    select schema_name
    from information_schema.schemata
    order by schema_name;
  `;
  console.log("\n=== SCHEMAS ===");
  console.table(schemas);

  const tables = await sql`
    select table_schema, table_name
    from information_schema.tables
    where table_type = 'BASE TABLE'
      and table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name;
  `;
  console.log("\n=== TABLES ===");
  console.table(tables);

  const columns = await sql`
    select
      table_schema,
      table_name,
      ordinal_position,
      column_name,
      data_type,
      is_nullable,
      column_default
    from information_schema.columns
    where table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name, ordinal_position;
  `;
  console.log("\n=== COLUMNS ===");
  console.table(columns);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
