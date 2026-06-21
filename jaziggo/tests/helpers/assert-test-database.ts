const TEST_DATABASE_MARKER = /(^|[_-])(test|testing|e2e|integration)($|[_-])/i;
const PRODUCTION_MARKER = /(^|[._-])(prod|production|primary|live)($|[._-])/i;
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

export interface TestDatabaseUrls {
  testDatabaseUrl?: string;
  databaseUrl?: string;
}

interface ParsedDatabaseUrl {
  databaseName: string;
  hostname: string;
  identity: string;
}

function normalizeHostname(hostname: string): string {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "[::1]"
  ) {
    return "local";
  }

  return normalized;
}

function parseDatabaseUrl(rawUrl: string, variableName: string): ParsedDatabaseUrl {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (!POSTGRES_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  let databaseName: string;

  try {
    databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (!parsedUrl.hostname || !databaseName || databaseName.includes("/")) {
    throw new Error(`${variableName} must identify a PostgreSQL database.`);
  }

  const hostname = normalizeHostname(parsedUrl.hostname);
  const port = parsedUrl.port || "5432";

  return {
    databaseName,
    hostname,
    identity: `${hostname}:${port}/${databaseName.toLowerCase()}`,
  };
}

export function assertTestDatabaseUrl({
  testDatabaseUrl = process.env.TEST_DATABASE_URL,
  databaseUrl = process.env.DATABASE_URL,
}: TestDatabaseUrls = {}): string {
  const candidate = testDatabaseUrl?.trim();

  if (!candidate) {
    throw new Error("TEST_DATABASE_URL is required for test database operations.");
  }

  const testDatabase = parseDatabaseUrl(candidate, "TEST_DATABASE_URL");

  if (
    PRODUCTION_MARKER.test(testDatabase.hostname) ||
    PRODUCTION_MARKER.test(testDatabase.databaseName)
  ) {
    throw new Error("TEST_DATABASE_URL must not reference a production-like database.");
  }

  if (!TEST_DATABASE_MARKER.test(testDatabase.databaseName)) {
    throw new Error("TEST_DATABASE_URL must identify an isolated test database.");
  }

  const developmentCandidate = databaseUrl?.trim();

  if (developmentCandidate) {
    const developmentDatabase = parseDatabaseUrl(developmentCandidate, "DATABASE_URL");

    if (testDatabase.identity === developmentDatabase.identity) {
      throw new Error("TEST_DATABASE_URL must not target the same database as DATABASE_URL.");
    }
  }

  return candidate;
}
