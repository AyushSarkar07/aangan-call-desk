// Applies supabase/migrations/*.sql in order to DATABASE_URL_UNPOOLED (or DATABASE_URL) from .env.local.
import postgres from "postgres";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const sql = postgres(env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL, { max: 1 });
for (const f of fs.readdirSync("supabase/migrations").sort()) {
  await sql.unsafe(fs.readFileSync(`supabase/migrations/${f}`, "utf8"));
  console.log("applied", f);
}
const t = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
console.log("tables:", t.map((r) => r.table_name).join(", "));
await sql.end();
