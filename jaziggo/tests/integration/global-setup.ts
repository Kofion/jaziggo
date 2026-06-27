import { resetIntegrationDatabase } from "./setup-database";

export default async function globalSetup(): Promise<void> {
  await resetIntegrationDatabase();
}
