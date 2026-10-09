// One-off: creates the `aangan` database on the same Neon server and prints nothing secret.
import postgres from "postgres";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(process.argv[2], "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const direct = env.DATABASE_URL_UNPOOLED;
const sql = postgres(direct, { max: 1 });
const dbs = await sql`select datname from pg_database where datistemplate = false`;
console.log("existing databases:", dbs.map((d) => d.datname).join(", "));
if (!dbs.some((d) => d.datname === "aangan")) { await sql.unsafe("create database aangan"); console.log("created aangan"); }
await sql.end();
const swap = (u) => { const x = new URL(u); x.pathname = "/aangan"; return x.toString(); };
const out = `DATABASE_URL=${swap(env.DATABASE_URL)}\nDATABASE_URL_UNPOOLED=${swap(direct)}\n`;
fs.writeFileSync(process.argv[3], out, { mode: 0o600, flag: "a" });
console.log("wrote DATABASE_URL to", process.argv[3]);
