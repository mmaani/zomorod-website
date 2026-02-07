import fs from "node:fs";
import postgres from "postgres";

function splitSqlStatements(input) {
  const statements = [];
  let current = "";

  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === "*" && next === "/") {
        current += next;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (dollarTag) {
      if (input.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length - 1;
        dollarTag = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (!inSingle && !inDouble && ch === "-" && next === "-") {
      current += ch + next;
      i += 1;
      inLineComment = true;
      continue;
    }

    if (!inSingle && !inDouble && ch === "/" && next === "*") {
      current += ch + next;
      i += 1;
      inBlockComment = true;
      continue;
    }

    if (!inDouble && ch === "'" ) {
      current += ch;
      if (inSingle && next === "'") {
        current += next;
        i += 1;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }

    if (!inSingle && ch === '"') {
      current += ch;
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && ch === "$") {
      const tail = input.slice(i);
      const m = tail.match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (m) {
        dollarTag = m[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }

    if (!inSingle && !inDouble && ch === ";") {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = "";
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sqlText = fs.readFileSync(file, "utf8");

// Neon + postgres: SSL is required
const sql = postgres(url, {
  ssl: "require",
  max: 1,
  idle_timeout: 10,
  connect_timeout: 10,
});

try {
  const statements = splitSqlStatements(sqlText);

  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }

  console.log("✅ Migration executed:", file);
} catch (e) {
  console.error("❌ Migration failed:", e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}