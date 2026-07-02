import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const redoclyCli = resolve(appRoot, "node_modules", "@redocly", "cli", "bin", "cli.js");
const configPath = ".redocly.yaml";
const contractPath = "../specs/001-cemetery-management/contracts/openapi.yaml";
const resolvedConfigPath = resolve(appRoot, configPath);
const resolvedContractPath = resolve(appRoot, contractPath);

if (!existsSync(redoclyCli)) {
  console.error("Redocly CLI is not installed. Run npm install before validating OpenAPI.");
  process.exit(1);
}

if (!existsSync(resolvedConfigPath)) {
  console.error("Redocly configuration file was not found.");
  process.exit(1);
}

if (!existsSync(resolvedContractPath)) {
  console.error("OpenAPI contract file was not found.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [redoclyCli, "lint", contractPath, "--config", configPath],
  {
    cwd: appRoot,
    env: {
      ...process.env,
      REDOCLY_TELEMETRY: "off",
      REDOCLY_SUPPRESS_UPDATE_NOTICE: "true",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("OpenAPI validation could not be started.");
  console.error(result.error.message);
  process.exit(1);
}

if (result.signal) {
  console.error(`OpenAPI validation stopped with signal ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
