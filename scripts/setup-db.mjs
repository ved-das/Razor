import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = join(process.cwd(), "prisma", "dev.db");
mkdirSync(dirname(dbPath), { recursive: true });

function runPrisma(args, options = {}) {
  if (process.platform === "win32") {
    return execFileSync("cmd.exe", ["/c", "npx.cmd", "prisma", ...args], options);
  }
  return execFileSync("npx", ["prisma", ...args], options);
}

runPrisma(["generate"], { stdio: "inherit" });

const sql = runPrisma(["migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" });

const db = new DatabaseSync(dbPath);
try {
  db.exec(sql);
  console.log(`Razor database ready at ${dbPath}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("already exists")) {
    throw error;
  }
  console.log(`Razor database already exists at ${dbPath}`);
} finally {
  db.close();
}
