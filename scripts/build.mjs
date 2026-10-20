import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const deploySchema =
  process.env.VERCEL_ENV === "production" ||
  process.env.DEPLOY_DATABASE_SCHEMA === "true";

if (deploySchema && !process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for production schema deployment.");
  process.exit(1);
}

function run(tool, args) {
  const result = spawnSync(
    npmCommand,
    ["exec", "--", tool, ...args],
    { env: process.env, stdio: "inherit" }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("prisma", ["generate"]);

if (deploySchema) {
  run("prisma", ["db", "push", "--skip-generate"]);
} else {
  console.log("Skipping database schema push outside production.");
}

run("next", ["build"]);
