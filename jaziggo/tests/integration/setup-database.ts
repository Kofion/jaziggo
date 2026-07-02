import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertTestDatabaseUrl } from "../helpers/assert-test-database";

export interface ResetIntegrationDatabaseOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

interface IntegrationDatabaseUrlEnv {
  [key: string]: string | undefined;
  DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const prismaSchemaPath = "prisma/schema.prisma";

function prismaExecutable(): string {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

export function resolveIntegrationDatabaseUrl(
  env: IntegrationDatabaseUrlEnv = process.env,
): string {
  return assertTestDatabaseUrl({
    databaseUrl: env.DATABASE_URL,
    testDatabaseUrl: env.TEST_DATABASE_URL,
  });
}

function buildIntegrationDatabaseEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const integrationDatabaseUrl = resolveIntegrationDatabaseUrl(env);

  return {
    ...env,
    DATABASE_URL: integrationDatabaseUrl,
    NODE_ENV: "test",
    TEST_DATABASE_URL: integrationDatabaseUrl,
  };
}

function runPrismaCommand(
  args: readonly string[],
  options: Required<ResetIntegrationDatabaseOptions>,
): Promise<void> {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(prismaExecutable(), ["prisma", ...args], {
      cwd: options.cwd,
      env: options.env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("error", (error) => {
      rejectCommand(error);
    });

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolveCommand();
        return;
      }

      const outcome =
        code === null ? `signal ${signal ?? "unknown"}` : `exit code ${code}`;
      rejectCommand(new Error(`Prisma command failed with ${outcome}.`));
    });
  });
}

export async function resetIntegrationDatabase(
  options: ResetIntegrationDatabaseOptions = {},
): Promise<void> {
  const integrationOptions: Required<ResetIntegrationDatabaseOptions> = {
    cwd: options.cwd ?? projectRoot,
    env: buildIntegrationDatabaseEnv(options.env ?? process.env),
  };

  await runPrismaCommand(
    [
      "migrate",
      "reset",
      "--force",
      "--skip-seed",
      "--schema",
      prismaSchemaPath,
    ],
    integrationOptions,
  );

  await runPrismaCommand(["db", "seed", "--schema", prismaSchemaPath], integrationOptions);
}
