import postgres from "postgres";

let sql;

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  }
  return sql;
}
