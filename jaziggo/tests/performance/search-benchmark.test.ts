import { PrismaClient, type Prisma } from "@prisma/client"

import { MAX_PAGE_SIZE } from "../../types/api"
import { normalizeDocument } from "../../lib/validation/normalize"

const PERFORMANCE_DATABASE_MARKER =
  /(^|[._-])(perf|performance|benchmark|baseline)($|[._-])/i
const BLOCKED_DATABASE_MARKER =
  /(^|[._-])(prod|production|primary|live|dev|development|test|testing|e2e|integration)($|[._-])/i
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"])
const REQUIRED_EXECUTION_FLAGS = [
  "--execute",
  "--confirm-performance-benchmark",
] as const

const TARGET_DURATION_MS = 3_000
const REQUIRED_WITHIN_TARGET_RATE = 0.95
const DEFAULT_ITERATIONS = 20
const DEFAULT_WARMUP_ITERATIONS = 2
const DEFAULT_PAGE_SIZE = MAX_PAGE_SIZE

const BASELINE_EXPECTED = {
  deceased: 100_000,
  burialLinks: 100_000,
  activeBurialLinks: 80_000,
} as const

const LOCATION_SEARCH_SELECT = {
  id: true,
  burialDate: true,
  deceased: {
    select: {
      id: true,
      internalCode: true,
      fullName: true,
      document: true,
      deathDate: true,
      burialDate: true,
      historicalDataIncomplete: true,
    },
  },
  burialSpace: {
    select: {
      id: true,
      type: true,
      sector: true,
      block: true,
      street: true,
      row: true,
      number: true,
      complement: true,
      status: true,
    },
  },
  responsible: {
    select: {
      fullName: true,
      document: true,
    },
  },
} as const satisfies Prisma.BurialLinkSelect

type DatabaseIdentity = Readonly<{
  databaseName: string
  hostname: string
  identity: string
}>

type CliOptions = Readonly<{
  confirm: boolean
  execute: boolean
  help: boolean
  iterations: number
  pageSize: number
  warmupIterations: number
}>

type RowCount = Readonly<{
  count: bigint
}>

type BenchmarkScenario = Readonly<{
  name: string
  run: () => Promise<number>
}>

type BenchmarkSample = Readonly<{
  durationMs: number
  resultCount: number
  scenario: string
}>

type ScenarioMetrics = Readonly<{
  averageMs: number
  maximumMs: number
  minimumMs: number
  p50Ms: number
  p90Ms: number
  p95Ms: number
  p99Ms: number
  sampleCount: number
  totalResultCount: number
  withinTargetRate: number
}>

function printHelp(): void {
  console.info(`
Jaziggo location-search performance benchmark

Measures read-only location-search query patterns against the T164 synthetic performance baseline.

Safe commands:
  npx vite-node tests/performance/search-benchmark.test.ts --help
  npx vite-node tests/performance/search-benchmark.test.ts

Real benchmark command:
  $env:PERFORMANCE_DATABASE_URL="postgresql://..."
  npx vite-node tests/performance/search-benchmark.test.ts --execute --confirm-performance-benchmark

Options:
  --iterations=20          Measured runs per scenario.
  --warmup=2              Unmeasured warmup runs per scenario.
  --page-size=100         Page size for paginated scenarios. Maximum: 100.

Safety rules:
  - --help and default mode do not connect to PostgreSQL or run queries.
  - Real execution requires PERFORMANCE_DATABASE_URL.
  - The database name must include perf, performance, benchmark, or baseline.
  - Development, test, integration, e2e, live, primary, production, and prod markers are rejected.
  - DATABASE_URL and TEST_DATABASE_URL must not point to the same database identity.
  - The benchmark is read-only and logs only aggregate metrics.
  - Full documents, phones, emails, and addresses are never printed.
  - The run fails when fewer than 95% of searches complete within 3000ms.
`)
}

function parsePositiveIntegerOption(
  args: readonly string[],
  name: string,
  fallback: number,
): number {
  const option = args.find((arg) => arg.startsWith(`--${name}=`))
  if (!option) return fallback

  const parsed = Number(option.slice(name.length + 3))

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} must be a positive integer.`)
  }

  return parsed
}

function parseCliOptions(args: readonly string[]): CliOptions {
  const pageSize = parsePositiveIntegerOption(
    args,
    "page-size",
    DEFAULT_PAGE_SIZE,
  )

  if (pageSize > MAX_PAGE_SIZE) {
    throw new Error(`--page-size must not exceed ${MAX_PAGE_SIZE}.`)
  }

  return {
    confirm: args.includes("--confirm-performance-benchmark"),
    execute: args.includes("--execute"),
    help: args.includes("--help") || args.includes("-h"),
    iterations: parsePositiveIntegerOption(
      args,
      "iterations",
      DEFAULT_ITERATIONS,
    ),
    pageSize,
    warmupIterations: parsePositiveIntegerOption(
      args,
      "warmup",
      DEFAULT_WARMUP_ITERATIONS,
    ),
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

function parseDatabaseUrl(
  rawUrl: string,
  variableName: string,
): DatabaseIdentity {
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
    throw new Error("PERFORMANCE_DATABASE_URL is required for real benchmarking.")
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
    return !options.confirm
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

function locationKeyFilter(
  key: string,
  value: string,
): Prisma.BurialSpaceWhereInput {
  const token = `${key}=${encodeURIComponent(value)}`

  return {
    OR: [
      { locationKey: { contains: `${token}|` } },
      { locationKey: { endsWith: token } },
    ],
  }
}

async function findLocationPage(
  prisma: PrismaClient,
  where: Prisma.BurialLinkWhereInput,
  pageSize: number,
): Promise<number> {
  const [links] = await prisma.$transaction([
    prisma.burialLink.findMany({
      where,
      select: LOCATION_SEARCH_SELECT,
      orderBy: [
        { deceased: { searchName: "asc" } },
        { deceased: { internalCode: "asc" } },
        { id: "asc" },
      ],
      skip: 0,
      take: pageSize,
    }),
    prisma.burialLink.count({ where }),
  ])

  return links.length
}

async function findLocationDetail(
  prisma: PrismaClient,
  deceasedId: string,
): Promise<number> {
  const link = await prisma.burialLink.findFirst({
    where: {
      deceasedId,
      status: "ACTIVE",
    },
    select: LOCATION_SEARCH_SELECT,
  })

  return link ? 1 : 0
}

function buildScenarios(
  prisma: PrismaClient,
  pageSize: number,
): readonly BenchmarkScenario[] {
  const deathDate = dateFromIndex(1_234)
  const burialDate = dateFromIndex(22_222)

  return [
    {
      name: "deceased-name-partial",
      run: () =>
        findLocationPage(
          prisma,
          {
            status: "ACTIVE",
            deceased: {
              is: {
                searchName: {
                  contains: "performance deceased 001",
                },
              },
            },
          },
          pageSize,
        ),
    },
    {
      name: "deceased-death-date",
      run: () =>
        findLocationPage(
          prisma,
          {
            status: "ACTIVE",
            deceased: {
              is: {
                deathDate,
              },
            },
          },
          pageSize,
        ),
    },
    {
      name: "burial-date",
      run: () =>
        findLocationPage(
          prisma,
          {
            status: "ACTIVE",
            OR: [
              { burialDate },
              {
                deceased: {
                  is: {
                    burialDate,
                  },
                },
              },
            ],
          },
          pageSize,
        ),
    },
    {
      name: "sector-filter",
      run: () =>
        findLocationPage(
          prisma,
          {
            status: "ACTIVE",
            burialSpace: {
              is: {
                AND: [locationKeyFilter("sector", "performance sector 01")],
              },
            },
          },
          pageSize,
        ),
    },
    {
      name: "burial-space-identifier",
      run: () =>
        findLocationPage(
          prisma,
          {
            status: "ACTIVE",
            burialSpace: {
              is: {
                identifier: "PERF-SEP-00123",
              },
            },
          },
          pageSize,
        ),
    },
    {
      name: "responsible-name",
      run: () =>
        findLocationPage(
          prisma,
          {
            status: "ACTIVE",
            responsible: {
              is: {
                searchName: {
                  contains: "performance responsible 00005",
                },
              },
            },
          },
          pageSize,
        ),
    },
    {
      name: "deceased-document-exact",
      run: () =>
        findLocationPage(
          prisma,
          {
            status: "ACTIVE",
            deceased: {
              is: {
                document: normalizeDocument("PERF-DEC-DOC-000000012345"),
              },
            },
          },
          pageSize,
        ),
    },
    {
      name: "responsible-document-exact-empty",
      run: () =>
        findLocationPage(
          prisma,
          {
            status: "ACTIVE",
            responsible: {
              is: {
                document: normalizeDocument("PERF-RESP-DOC-000000000002"),
              },
            },
          },
          pageSize,
        ),
    },
    {
      name: "location-detail-by-deceased",
      run: () =>
        findLocationDetail(prisma, deterministicUuid(0x16420000, 12_345)),
    },
  ]
}

async function validateBaseline(prisma: PrismaClient): Promise<void> {
  const [deceased, burialLinks, activeBurialLinks] = await Promise.all([
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "Deceased"`,
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "BurialLink"`,
    prisma.$queryRaw<RowCount[]>`SELECT COUNT(*)::bigint AS count FROM "BurialLink" WHERE "status" = 'ACTIVE'`,
  ])

  const deceasedCount = Number(deceased[0]?.count ?? 0)
  const burialLinkCount = Number(burialLinks[0]?.count ?? 0)
  const activeBurialLinkCount = Number(activeBurialLinks[0]?.count ?? 0)

  if (
    deceasedCount < BASELINE_EXPECTED.deceased ||
    burialLinkCount < BASELINE_EXPECTED.burialLinks ||
    activeBurialLinkCount < BASELINE_EXPECTED.activeBurialLinks
  ) {
    throw new Error(
      "Performance baseline is incomplete. Run the T164 seed against the isolated performance database first.",
    )
  }

  console.info("Baseline counts verified:")
  console.info(`- Deceased: ${deceasedCount}`)
  console.info(`- Burial links: ${burialLinkCount}`)
  console.info(`- Active burial links: ${activeBurialLinkCount}`)
}

async function measureScenario(
  scenario: BenchmarkScenario,
): Promise<BenchmarkSample> {
  const startedAt = performance.now()
  const resultCount = await scenario.run()
  const durationMs = performance.now() - startedAt

  return {
    durationMs,
    resultCount,
    scenario: scenario.name,
  }
}

function percentile(sortedValues: readonly number[], percentileValue: number): number {
  if (sortedValues.length === 0) return 0

  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil((percentileValue / 100) * sortedValues.length) - 1,
  )

  return sortedValues[index] ?? 0
}

function calculateMetrics(samples: readonly BenchmarkSample[]): ScenarioMetrics {
  const durations = samples
    .map((sample) => sample.durationMs)
    .sort((left, right) => left - right)
  const sampleCount = samples.length
  const totalDuration = durations.reduce((total, value) => total + value, 0)
  const withinTargetCount = durations.filter(
    (duration) => duration <= TARGET_DURATION_MS,
  ).length

  return {
    averageMs: sampleCount === 0 ? 0 : totalDuration / sampleCount,
    maximumMs: durations.at(-1) ?? 0,
    minimumMs: durations[0] ?? 0,
    p50Ms: percentile(durations, 50),
    p90Ms: percentile(durations, 90),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    sampleCount,
    totalResultCount: samples.reduce(
      (total, sample) => total + sample.resultCount,
      0,
    ),
    withinTargetRate:
      sampleCount === 0 ? 0 : withinTargetCount / sampleCount,
  }
}

function formatMs(value: number): string {
  return value.toFixed(2)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function printPlan(options: CliOptions): void {
  console.info("Mode: dry-run")
  console.info("Location-search benchmark plan:")
  console.info(`- Scenarios: ${buildScenarios({} as PrismaClient, options.pageSize).length}`)
  console.info(`- Measured iterations per scenario: ${options.iterations}`)
  console.info(`- Warmup iterations per scenario: ${options.warmupIterations}`)
  console.info(`- Page size: ${options.pageSize}`)
  console.info(`- Target: at least 95% of searches <= ${TARGET_DURATION_MS}ms`)
  console.info("No database connection was opened. Pass --help for execution details.")
}

async function runBenchmark(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<readonly BenchmarkSample[]> {
  const scenarios = buildScenarios(prisma, options.pageSize)
  const measuredSamples: BenchmarkSample[] = []

  for (const scenario of scenarios) {
    for (let index = 0; index < options.warmupIterations; index += 1) {
      await scenario.run()
    }

    for (let index = 0; index < options.iterations; index += 1) {
      measuredSamples.push(await measureScenario(scenario))
    }
  }

  return measuredSamples
}

function printMetrics(samples: readonly BenchmarkSample[]): void {
  const scenarios = [...new Set(samples.map((sample) => sample.scenario))]

  console.info("Location-search benchmark metrics:")
  for (const scenario of scenarios) {
    const scenarioSamples = samples.filter(
      (sample) => sample.scenario === scenario,
    )
    const metrics = calculateMetrics(scenarioSamples)

    console.info(`- ${scenario}`)
    console.info(`  searches: ${metrics.sampleCount}`)
    console.info(`  minMs: ${formatMs(metrics.minimumMs)}`)
    console.info(`  avgMs: ${formatMs(metrics.averageMs)}`)
    console.info(`  p50Ms: ${formatMs(metrics.p50Ms)}`)
    console.info(`  p90Ms: ${formatMs(metrics.p90Ms)}`)
    console.info(`  p95Ms: ${formatMs(metrics.p95Ms)}`)
    console.info(`  p99Ms: ${formatMs(metrics.p99Ms)}`)
    console.info(`  maxMs: ${formatMs(metrics.maximumMs)}`)
    console.info(`  within3000ms: ${formatPercent(metrics.withinTargetRate)}`)
    console.info(`  totalResultCount: ${metrics.totalResultCount}`)
  }

  const aggregateMetrics = calculateMetrics(samples)
  console.info("- aggregate")
  console.info(`  searches: ${aggregateMetrics.sampleCount}`)
  console.info(`  minMs: ${formatMs(aggregateMetrics.minimumMs)}`)
  console.info(`  avgMs: ${formatMs(aggregateMetrics.averageMs)}`)
  console.info(`  p50Ms: ${formatMs(aggregateMetrics.p50Ms)}`)
  console.info(`  p90Ms: ${formatMs(aggregateMetrics.p90Ms)}`)
  console.info(`  p95Ms: ${formatMs(aggregateMetrics.p95Ms)}`)
  console.info(`  p99Ms: ${formatMs(aggregateMetrics.p99Ms)}`)
  console.info(`  maxMs: ${formatMs(aggregateMetrics.maximumMs)}`)
  console.info(`  within3000ms: ${formatPercent(aggregateMetrics.withinTargetRate)}`)
  console.info(`  totalResultCount: ${aggregateMetrics.totalResultCount}`)

  if (aggregateMetrics.withinTargetRate < REQUIRED_WITHIN_TARGET_RATE) {
    throw new Error(
      `Search benchmark failed: ${formatPercent(
        aggregateMetrics.withinTargetRate,
      )} completed within ${TARGET_DURATION_MS}ms; required ${formatPercent(
        REQUIRED_WITHIN_TARGET_RATE,
      )}.`,
    )
  }
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  if (!options.execute) {
    printPlan(options)
    return
  }

  assertExecutionFlags(options)

  const performanceDatabaseUrl = assertPerformanceDatabaseUrl(process.env)
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: performanceDatabaseUrl,
      },
    },
  })

  try {
    console.info("Mode: execute")
    console.info(`Measured iterations per scenario: ${options.iterations}`)
    console.info(`Warmup iterations per scenario: ${options.warmupIterations}`)
    console.info(`Page size: ${options.pageSize}`)
    await validateBaseline(prisma)
    const samples = await runBenchmark(prisma, options)
    printMetrics(samples)
    console.info("Location-search benchmark completed.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error("Location-search benchmark failed.")
  }

  process.exitCode = 1
})
