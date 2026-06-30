import { argon2id, hash } from "argon2"
import { PrismaClient } from "@prisma/client"

import {
  generateLocationKey,
  normalizeDocument,
  normalizePhone,
  normalizeSearchName,
} from "../../lib/validation/normalize"
import { BURIAL_LINK_STATUS } from "../../types/burial-link"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
} from "../../types/burial-space"
import { USER_ROLE, USER_STATUS } from "../../types/user"

const BASELINE = {
  users: 100,
  deceased: 100_000,
  burialSpaces: 25_000,
  responsibles: 10_000,
  burialLinks: 100_000,
  activeBurialLinks: 80_000,
  batchSize: 1_000,
} as const

const REQUIRED_EXECUTION_FLAGS = [
  "--execute",
  "--confirm-performance-baseline",
  "--truncate-performance-data",
] as const

const PERFORMANCE_DATABASE_MARKER =
  /(^|[._-])(perf|performance|benchmark|baseline)($|[._-])/i
const BLOCKED_DATABASE_MARKER =
  /(^|[._-])(prod|production|primary|live|dev|development|test|testing|e2e|integration)($|[._-])/i
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"])
const PASSWORD_PLACEHOLDER = "performance-baseline-synthetic-password"

type DatabaseIdentity = Readonly<{
  databaseName: string
  hostname: string
  identity: string
}>

type CliOptions = Readonly<{
  help: boolean
  execute: boolean
  confirm: boolean
  truncate: boolean
  batchSize: number
}>

type RowCount = Readonly<{
  count: bigint
}>

type PeriodCount = Readonly<{
  period: string
  count: bigint
}>

function printHelp(): void {
  console.info(`
Jaziggo performance baseline seed

Creates a deterministic synthetic baseline for performance-only PostgreSQL databases.

Safe commands:
  npx vite-node tests/performance/seed-baseline.ts --help
  npx vite-node tests/performance/seed-baseline.ts

Real seed command:
  $env:PERFORMANCE_DATABASE_URL="postgresql://..."
  npx vite-node tests/performance/seed-baseline.ts --execute --confirm-performance-baseline --truncate-performance-data

Safety rules:
  - --help and default mode do not connect to PostgreSQL or write data.
  - Real execution requires PERFORMANCE_DATABASE_URL.
  - The database name must include perf, performance, benchmark, or baseline.
  - Development, test, integration, e2e, live, primary, production, and prod markers are rejected.
  - DATABASE_URL and TEST_DATABASE_URL must not point to the same database identity.
  - Real execution truncates only after --truncate-performance-data is present.
  - Logs contain aggregate distribution only; full documents, contacts, passwords, and hashes are not printed.
`)
}

function parseCliOptions(args: readonly string[]): CliOptions {
  const batchSizeArg = args.find((arg) => arg.startsWith("--batch-size="))
  const parsedBatchSize = batchSizeArg
    ? Number(batchSizeArg.slice("--batch-size=".length))
    : BASELINE.batchSize

  if (!Number.isInteger(parsedBatchSize) || parsedBatchSize < 100) {
    throw new Error("--batch-size must be an integer greater than or equal to 100.")
  }

  return {
    help: args.includes("--help") || args.includes("-h"),
    execute: args.includes("--execute"),
    confirm: args.includes("--confirm-performance-baseline"),
    truncate: args.includes("--truncate-performance-data"),
    batchSize: parsedBatchSize,
  }
}

function normalizeHostname(hostname: string): string {
  const normalized = hostname.toLowerCase()

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "[::1]"
  ) {
    return "local"
  }

  return normalized
}

function parseDatabaseUrl(rawUrl: string, variableName: string): DatabaseIdentity {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`)
  }

  if (!POSTGRES_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`)
  }

  let databaseName: string

  try {
    databaseName = decodeURIComponent(parsedUrl.pathname.slice(1))
  } catch {
    throw new Error(`${variableName} must identify a PostgreSQL database.`)
  }

  if (!parsedUrl.hostname || !databaseName || databaseName.includes("/")) {
    throw new Error(`${variableName} must identify a PostgreSQL database.`)
  }

  const hostname = normalizeHostname(parsedUrl.hostname)
  const port = parsedUrl.port || "5432"

  return {
    databaseName,
    hostname,
    identity: `${hostname}:${port}/${databaseName.toLowerCase()}`,
  }
}

function assertPerformanceDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const candidate = env.PERFORMANCE_DATABASE_URL?.trim()

  if (!candidate) {
    throw new Error("PERFORMANCE_DATABASE_URL is required for real baseline seeding.")
  }

  const performanceDatabase = parseDatabaseUrl(
    candidate,
    "PERFORMANCE_DATABASE_URL",
  )

  if (
    BLOCKED_DATABASE_MARKER.test(performanceDatabase.hostname) ||
    BLOCKED_DATABASE_MARKER.test(performanceDatabase.databaseName)
  ) {
    throw new Error(
      "PERFORMANCE_DATABASE_URL must not reference development, test, integration, or production-like databases.",
    )
  }

  if (!PERFORMANCE_DATABASE_MARKER.test(performanceDatabase.databaseName)) {
    throw new Error(
      "PERFORMANCE_DATABASE_URL must identify an isolated performance database.",
    )
  }

  for (const variableName of ["DATABASE_URL", "TEST_DATABASE_URL"] as const) {
    const comparisonCandidate = env[variableName]?.trim()

    if (!comparisonCandidate) continue

    const comparisonDatabase = parseDatabaseUrl(comparisonCandidate, variableName)

    if (comparisonDatabase.identity === performanceDatabase.identity) {
      throw new Error(
        `PERFORMANCE_DATABASE_URL must not target the same database as ${variableName}.`,
      )
    }
  }

  return candidate
}

function assertExecutionFlags(options: CliOptions): void {
  const missingFlags = REQUIRED_EXECUTION_FLAGS.filter((flag) => {
    if (flag === "--execute") return !options.execute
    if (flag === "--confirm-performance-baseline") return !options.confirm
    return !options.truncate
  })

  if (missingFlags.length > 0) {
    throw new Error(`Missing required flag(s): ${missingFlags.join(", ")}.`)
  }
}

function deterministicUuid(namespace: number, index: number): string {
  const firstSegment = namespace.toString(16).padStart(8, "0").slice(0, 8)
  const lastSegment = index.toString(16).padStart(12, "0").slice(-12)

  return `${firstSegment}-0000-4000-8000-${lastSegment}`
}

function dateFromIndex(index: number, startYear = 2018): Date {
  const year = startYear + (index % 8)
  const month = index % 12
  const day = (index % 28) + 1

  return new Date(Date.UTC(year, month, day))
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000)
}

function printPlan(mode: "dry-run" | "execute"): void {
  console.info(`Mode: ${mode}`)
  console.info("Baseline distribution plan:")
  console.info(`- Users: ${BASELINE.users} synthetic internal users`)
  console.info(`- Deceased: ${BASELINE.deceased} synthetic deceased records`)
  console.info(`- Burial spaces: ${BASELINE.burialSpaces} synthetic spaces`)
  console.info(`- Responsibles: ${BASELINE.responsibles} synthetic responsibles`)
  console.info(`- Burial links: ${BASELINE.burialLinks} synthetic links`)
  console.info(
    `- Link status split: ${BASELINE.activeBurialLinks} ACTIVE / ${
      BASELINE.burialLinks - BASELINE.activeBurialLinks
    } ENDED`,
  )
}

async function insertBatches<T>(
  total: number,
  batchSize: number,
  buildBatch: (startIndex: number, endIndex: number) => T[],
  insertBatch: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let startIndex = 1; startIndex <= total; startIndex += batchSize) {
    const endIndex = Math.min(startIndex + batchSize - 1, total)
    const batch = buildBatch(startIndex, endIndex)
    await insertBatch(batch)
  }
}

function buildUsers(startIndex: number, endIndex: number, passwordHash: string) {
  return Array.from(
    { length: endIndex - startIndex + 1 },
    (_, offset) => startIndex + offset,
  ).map((index) => {
    const isAdmin = index <= 10
    const role = isAdmin ? USER_ROLE.ADMIN : USER_ROLE.EMPLOYEE

    return {
      id: deterministicUuid(0x16410000, index),
      name: `Performance ${isAdmin ? "Admin" : "Employee"} ${index
        .toString()
        .padStart(3, "0")}`,
      email: `perf.${isAdmin ? "admin" : "employee"}.${index
        .toString()
        .padStart(3, "0")}@jaziggo.test`,
      passwordHash,
      role,
      status: index % 20 === 0 ? USER_STATUS.INACTIVE : USER_STATUS.ACTIVE,
    }
  })
}

function buildDeceased(startIndex: number, endIndex: number) {
  return Array.from(
    { length: endIndex - startIndex + 1 },
    (_, offset) => startIndex + offset,
  ).map((index) => {
    const datesUnknown = index % 20 === 0
    const hasDocument = index % 10 !== 0
    const deathDate = datesUnknown ? null : dateFromIndex(index)
    const burialDate = deathDate ? addDays(deathDate, 2) : null
    const fullName = `Performance Deceased ${String(index % 1_000).padStart(
      3,
      "0",
    )} ${index.toString().padStart(6, "0")}`

    return {
      id: deterministicUuid(0x16420000, index),
      internalCode: `PERF-DEC-${index.toString().padStart(6, "0")}`,
      fullName,
      searchName: normalizeSearchName(fullName),
      document: hasDocument
        ? normalizeDocument(`PERF-DEC-DOC-${index.toString().padStart(12, "0")}`)
        : null,
      birthDate: deathDate ? dateFromIndex(index, 1930) : null,
      deathDate,
      burialDate,
      datesUnknown,
      historicalDataIncomplete: !hasDocument || datesUnknown,
      notes: index % 25 === 0 ? "Synthetic historical baseline record" : null,
    }
  })
}

function buildBurialSpaces(startIndex: number, endIndex: number) {
  return Array.from(
    { length: endIndex - startIndex + 1 },
    (_, offset) => startIndex + offset,
  ).map((index) => {
    const type =
      index > 15_000 && index <= 20_000
        ? BURIAL_SPACE_TYPE.JAZIGO
        : BURIAL_SPACE_TYPE.SEPULTURA
    const status =
      index <= 20_000
        ? BURIAL_SPACE_STATUS.OCCUPIED
        : index <= 23_000
          ? BURIAL_SPACE_STATUS.AVAILABLE
          : index <= 24_000
            ? BURIAL_SPACE_STATUS.RESERVED
            : BURIAL_SPACE_STATUS.INACTIVE
    const sector = `Performance Sector ${String(index % 20).padStart(2, "0")}`
    const row = `Quadra ${String(index % 200).padStart(3, "0")}`
    const number = String(index)

    return {
      id: deterministicUuid(0x16430000, index),
      type,
      identifier: `${type === BURIAL_SPACE_TYPE.JAZIGO ? "PERF-JAZ" : "PERF-SEP"}-${index
        .toString()
        .padStart(5, "0")}`,
      locationKey: generateLocationKey({ sector, row, number }),
      sector,
      row,
      number,
      status,
      capacity: type === BURIAL_SPACE_TYPE.JAZIGO ? 13 : 1,
    }
  })
}

function buildResponsibles(startIndex: number, endIndex: number) {
  return Array.from(
    { length: endIndex - startIndex + 1 },
    (_, offset) => startIndex + offset,
  ).map((index) => {
    const fullName = `Performance Responsible ${index
      .toString()
      .padStart(5, "0")}`
    const hasDocument = index % 2 === 0
    const hasPhone = index % 3 === 0
    const hasEmail = index % 5 === 0
    const hasAddress = index % 7 === 0 || (!hasDocument && !hasPhone && !hasEmail)

    return {
      id: deterministicUuid(0x16440000, index),
      fullName,
      searchName: normalizeSearchName(fullName),
      document: hasDocument
        ? normalizeDocument(
            `PERF-RESP-DOC-${index.toString().padStart(12, "0")}`,
          )
        : null,
      phone: hasPhone
        ? normalizePhone(`119${index.toString().padStart(8, "0")}`)
        : null,
      email: hasEmail
        ? `perf.responsible.${index
            .toString()
            .padStart(5, "0")}@jaziggo.test`
        : null,
      address: hasAddress
        ? `Synthetic performance address ${index.toString().padStart(5, "0")}`
        : null,
    }
  })
}

function activeSpaceIdForLink(index: number): string {
  if (index <= 15_000) {
    return deterministicUuid(0x16430000, index)
  }

  const jazigoIndex = 15_001 + Math.floor((index - 15_001) / 13)
  return deterministicUuid(0x16430000, jazigoIndex)
}

function endedSpaceIdForLink(index: number): string {
  const availableSpaceIndex = 20_001 + ((index - BASELINE.activeBurialLinks - 1) % 5_000)
  return deterministicUuid(0x16430000, availableSpaceIndex)
}

function buildBurialLinks(startIndex: number, endIndex: number) {
  return Array.from(
    { length: endIndex - startIndex + 1 },
    (_, offset) => startIndex + offset,
  ).map((index) => {
    const isActive = index <= BASELINE.activeBurialLinks
    const burialDate = dateFromIndex(index)
    const responsibleIndex = (index % BASELINE.responsibles) + 1

    return {
      id: deterministicUuid(0x16450000, index),
      deceasedId: deterministicUuid(0x16420000, index),
      burialSpaceId: isActive
        ? activeSpaceIdForLink(index)
        : endedSpaceIdForLink(index),
      responsibleId:
        index % 4 === 0
          ? deterministicUuid(0x16440000, responsibleIndex)
          : null,
      burialDate,
      status: isActive ? BURIAL_LINK_STATUS.ACTIVE : BURIAL_LINK_STATUS.ENDED,
      endedAt: isActive ? null : addDays(burialDate, 180),
      endReason: isActive ? null : "Synthetic historical baseline closure",
      createdAt: burialDate,
      updatedAt: isActive ? burialDate : addDays(burialDate, 180),
    }
  })
}

async function truncatePerformanceTables(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ResponsibleLink", "BurialLink", "Responsible", "Deceased", "BurialSpace", "User" RESTART IDENTITY CASCADE',
  )
}

async function seedBaseline(prisma: PrismaClient, batchSize: number): Promise<void> {
  const passwordHash = await hash(PASSWORD_PLACEHOLDER, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })

  await insertBatches(
    BASELINE.users,
    batchSize,
    (start, end) => buildUsers(start, end, passwordHash),
    (batch) => prisma.user.createMany({ data: batch }),
  )

  await insertBatches(
    BASELINE.burialSpaces,
    batchSize,
    buildBurialSpaces,
    (batch) => prisma.burialSpace.createMany({ data: batch }),
  )

  await insertBatches(
    BASELINE.responsibles,
    batchSize,
    buildResponsibles,
    (batch) => prisma.responsible.createMany({ data: batch }),
  )

  await insertBatches(
    BASELINE.deceased,
    batchSize,
    buildDeceased,
    (batch) => prisma.deceased.createMany({ data: batch }),
  )

  await insertBatches(
    BASELINE.burialLinks,
    batchSize,
    buildBurialLinks,
    (batch) => prisma.burialLink.createMany({ data: batch }),
  )
}

function stringifyCount(value: bigint | number): string {
  return value.toString()
}

async function printDistribution(prisma: PrismaClient): Promise<void> {
  const [
    userDistribution,
    deceasedDocumented,
    deceasedUndocumented,
    deceasedUnknownDates,
    spaceDistribution,
    linkDistribution,
    responsibleDocumented,
    responsibleWithPhone,
    responsibleWithEmail,
    responsibleWithAddress,
    deceasedPeriods,
    burialPeriods,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["role", "status"],
      _count: { _all: true },
      orderBy: [{ role: "asc" }, { status: "asc" }],
    }),
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "Deceased" WHERE "document" IS NOT NULL`,
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "Deceased" WHERE "document" IS NULL`,
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "Deceased" WHERE "datesUnknown" = true`,
    prisma.burialSpace.groupBy({
      by: ["type", "status"],
      _count: { _all: true },
      orderBy: [{ type: "asc" }, { status: "asc" }],
    }),
    prisma.burialLink.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: [{ status: "asc" }],
    }),
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "Responsible" WHERE "document" IS NOT NULL`,
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "Responsible" WHERE "phone" IS NOT NULL`,
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "Responsible" WHERE "email" IS NOT NULL`,
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "Responsible" WHERE "address" IS NOT NULL`,
    prisma.$queryRaw<PeriodCount[]>`
      SELECT EXTRACT(YEAR FROM "deathDate")::text AS period, COUNT(*)::bigint AS count
      FROM "Deceased"
      WHERE "deathDate" IS NOT NULL
      GROUP BY period
      ORDER BY period
    `,
    prisma.$queryRaw<PeriodCount[]>`
      SELECT EXTRACT(YEAR FROM "burialDate")::text AS period, COUNT(*)::bigint AS count
      FROM "BurialLink"
      WHERE "burialDate" IS NOT NULL
      GROUP BY period
      ORDER BY period
    `,
  ])

  console.info("Baseline distribution:")
  console.info("- Users by role/status:")
  for (const item of userDistribution) {
    console.info(`  ${item.role}/${item.status}: ${item._count._all}`)
  }

  console.info("- Deceased privacy/date distribution:")
  console.info(`  with document: ${stringifyCount(deceasedDocumented[0]?.count ?? 0)}`)
  console.info(
    `  without document: ${stringifyCount(deceasedUndocumented[0]?.count ?? 0)}`,
  )
  console.info(
    `  dates unknown: ${stringifyCount(deceasedUnknownDates[0]?.count ?? 0)}`,
  )

  console.info("- Burial spaces by type/status:")
  for (const item of spaceDistribution) {
    console.info(`  ${item.type}/${item.status}: ${item._count._all}`)
  }

  console.info("- Burial links by status:")
  for (const item of linkDistribution) {
    console.info(`  ${item.status}: ${item._count._all}`)
  }

  console.info("- Responsibles safe contact-field distribution:")
  console.info(
    `  with document: ${stringifyCount(responsibleDocumented[0]?.count ?? 0)}`,
  )
  console.info(`  with phone: ${stringifyCount(responsibleWithPhone[0]?.count ?? 0)}`)
  console.info(`  with email: ${stringifyCount(responsibleWithEmail[0]?.count ?? 0)}`)
  console.info(
    `  with address: ${stringifyCount(responsibleWithAddress[0]?.count ?? 0)}`,
  )

  console.info("- Deceased death-date periods:")
  for (const item of deceasedPeriods) {
    console.info(`  ${item.period}: ${stringifyCount(item.count)}`)
  }

  console.info("- Burial-link burial-date periods:")
  for (const item of burialPeriods) {
    console.info(`  ${item.period}: ${stringifyCount(item.count)}`)
  }
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  if (!options.execute) {
    printPlan("dry-run")
    console.info("No database connection was opened. Pass --help for real execution details.")
    return
  }

  assertExecutionFlags(options)
  printPlan("execute")

  const performanceDatabaseUrl = assertPerformanceDatabaseUrl(process.env)
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: performanceDatabaseUrl,
      },
    },
  })

  try {
    await truncatePerformanceTables(prisma)
    await seedBaseline(prisma, options.batchSize)
    await printDistribution(prisma)
    console.info("Performance baseline seed completed.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error("Performance baseline seed failed.")
  }

  process.exitCode = 1
})
