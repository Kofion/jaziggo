import "server-only"

import { Counter, Histogram, register } from "prom-client"

export const LOCATION_SEARCH_OPERATION = {
  SEARCH: "search",
  SEARCH_BY_DOCUMENT: "search_by_document",
  DETAIL: "detail",
} as const

export type LocationSearchOperation =
  (typeof LOCATION_SEARCH_OPERATION)[keyof typeof LOCATION_SEARCH_OPERATION]

export const LOCATION_SEARCH_RESULT = {
  FOUND: "found",
  EMPTY: "empty",
  ERROR: "error",
} as const

export type LocationSearchResult =
  (typeof LOCATION_SEARCH_RESULT)[keyof typeof LOCATION_SEARCH_RESULT]

interface LocationSearchObservation {
  operation: LocationSearchOperation
  result: LocationSearchResult
  durationMs: number
  userId?: string
  resultCount?: number
}

const LOCATION_SEARCH_TOTAL_NAME = "jaziggo_location_search_total"
const LOCATION_SEARCH_DURATION_NAME =
  "jaziggo_location_search_duration_seconds"

const locationSearchTotal =
  (register.getSingleMetric(
    LOCATION_SEARCH_TOTAL_NAME,
  ) as Counter<"result"> | undefined) ??
  new Counter<"result">({
    name: LOCATION_SEARCH_TOTAL_NAME,
    help: "Total location search operations by result",
    labelNames: ["result"],
  })

const locationSearchDuration =
  (register.getSingleMetric(
    LOCATION_SEARCH_DURATION_NAME,
  ) as Histogram | undefined) ??
  new Histogram({
    name: LOCATION_SEARCH_DURATION_NAME,
    help: "Location search operation duration in seconds",
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 10],
  })

function normalizeDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return 0
  }

  return durationMs
}

function normalizeResultCount(
  resultCount: number | undefined,
): number | undefined {
  if (
    resultCount === undefined ||
    !Number.isSafeInteger(resultCount) ||
    resultCount < 0
  ) {
    return undefined
  }

  return resultCount
}

export function recordLocationSearchObservation(
  observation: LocationSearchObservation,
): void {
  const durationMs = normalizeDuration(observation.durationMs)
  const resultCount = normalizeResultCount(observation.resultCount)

  try {
    locationSearchTotal.inc({ result: observation.result })
    locationSearchDuration.observe(durationMs / 1000)
  } catch {
    // Observability must not change the location search outcome.
  }

  const record = {
    timestamp: new Date().toISOString(),
    level:
      observation.result === LOCATION_SEARCH_RESULT.ERROR
        ? "error"
        : observation.result === LOCATION_SEARCH_RESULT.EMPTY
          ? "warn"
          : "info",
    module: "location-search",
    operation: observation.operation,
    event: "location-search.completed",
    ...(observation.userId ? { userId: observation.userId } : {}),
    requestId: crypto.randomUUID(),
    message: "Location search completed",
    metadata: {
      result: observation.result,
      durationMs: Math.round(durationMs),
      ...(resultCount === undefined ? {} : { resultCount }),
    },
  }
  const serializedRecord = JSON.stringify(record)

  try {
    if (observation.result === LOCATION_SEARCH_RESULT.ERROR) {
      console.error(serializedRecord)
      return
    }

    if (observation.result === LOCATION_SEARCH_RESULT.EMPTY) {
      console.warn(serializedRecord)
      return
    }

    console.info(serializedRecord)
  } catch {
    // Observability must not change the location search outcome.
  }
}
