import { loadEnvConfig } from "@next/env";

import { resetIntegrationDatabase } from "./setup-database";

export default async function globalSetup(): Promise<void> {
  loadEnvConfig(process.cwd());
  await resetIntegrationDatabase();
}