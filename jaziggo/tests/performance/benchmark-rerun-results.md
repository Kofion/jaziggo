# T169 Benchmark Rerun Result

## Scope

T169 rechecks the T165 location-search benchmark and the T166 administrative reports benchmark after
the T167 query-plan analysis and the T168 decision not to create an index migration.

## Run Record

| Field | Value |
| --- | --- |
| Timestamp | 2026-06-30T12:16:54.0072030-03:00 |
| Environment status | Blocked: `PERFORMANCE_DATABASE_URL` is not configured in this workspace. |
| Benchmark execution | Not executed. No benchmark was run against development, test, integration, e2e, or production-like databases. |
| Safe validation commands | `npx.cmd vite-node tests/performance/search-benchmark.test.ts --help`; `npx.cmd vite-node tests/performance/report-benchmark.test.ts --help` |
| Index decision baseline | T168 documented that no index migration was applied because no real `EXPLAIN ANALYZE` evidence exists. |

## Approval Status

Performance approval is blocked until both benchmark scripts are executed against the isolated T164
performance baseline.

Pending confirmations:

- Location search: at least 95% of searches complete within 3000ms.
- Administrative reports: at least 95% of report executions complete within 10000ms.
- Pagination: page size remains capped at 100 results per page.

## Safe Execution Requirements

Real execution must use only `PERFORMANCE_DATABASE_URL` and the explicit confirmation flags already
implemented by the benchmark scripts:

```powershell
Set-Location jaziggo
$env:PERFORMANCE_DATABASE_URL="postgresql://..."
npx.cmd vite-node tests/performance/search-benchmark.test.ts --execute --confirm-performance-benchmark --page-size=100
npx.cmd vite-node tests/performance/report-benchmark.test.ts --execute --confirm-performance-report-benchmark --page-size=100
```

The benchmark scripts reject unsafe database identities, do not run in default/help mode, and log
only aggregate metrics.
