# T167 Query Plan Notes

## Scope

This document records the T167 performance-plan review for the synthetic T164 baseline and the
benchmarks created in T165 and T166.

No schema, migration, seed, fixture, API route, OpenAPI contract, or development/test database was
changed for this task.

## Safety Status

- Real `EXPLAIN ANALYZE` capture must run only against `PERFORMANCE_DATABASE_URL`.
- The database identity must follow the same safety rules used by the T164, T165, and T166 scripts:
  database name contains `perf`, `performance`, `benchmark`, or `baseline`; database/host names with
  `prod`, `production`, `primary`, `live`, `dev`, `development`, `test`, `testing`, `e2e`, or
  `integration` are rejected; and the target must not equal `DATABASE_URL` or `TEST_DATABASE_URL`.
- `PERFORMANCE_DATABASE_URL` was not set in this workspace, so no real plan was captured here.
- All queries below use synthetic baseline values and aggregate/technical output only.
- Page size is fixed at 100 or less.

## Baseline Shape

Expected T164 baseline:

| Entity | Expected rows | Notes |
| --- | ---: | --- |
| `Deceased` | 100000 | Synthetic names, documents, and dates only. |
| `BurialSpace` | 25000 | 20000 occupied, 3000 available, 1000 reserved, 1000 inactive. |
| `Responsible` | 10000 | Synthetic contact fields; not printed in plans. |
| `BurialLink` | 100000 | 80000 active and 20000 ended. |

## Existing Index Inventory

| Table | Index source | Purpose |
| --- | --- | --- |
| `Deceased` | unique `internalCode` | Distinguish records and support exact code lookup. |
| `Deceased` | `searchName` | Partial normalized-name search and report ordering support. |
| `Deceased` | `document` | Exact deceased-document search. |
| `Deceased` | `deathDate` | Search by death date. |
| `Deceased` | `burialDate` | Search by deceased burial date branch. |
| `BurialSpace` | unique `(type, identifier, locationKey)` | Space identity. |
| `BurialSpace` | `(status, type)` | Space report filters. |
| `BurialSpace` | `identifier` | Location search by space identifier. |
| `BurialSpace` | `sector` | Direct sector filters; current location filters use `locationKey`. |
| `BurialSpace` | `locationKey` | Location-component filters and ordering. |
| `Responsible` | `searchName` | Partial responsible-name search. |
| `Responsible` | `document` | Exact responsible-document search. |
| `Responsible` | `phone` | Exact phone search in other flows. |
| `BurialLink` | `(burialSpaceId, status)` | Active links by space and `_count` for reports. |
| `BurialLink` | `(deceasedId, status)` | Detail lookup by deceased and active status. |
| `BurialLink` | `responsibleId` | Join/filter by responsible. |
| `BurialLink` | `burialDate` | Burial-date reports and search branch. |

## Capture Command

Use a performance-only shell after confirming the URL is isolated. Do not run this against
development, test, integration, e2e, live, primary, or production-like databases.

```powershell
Set-Location jaziggo
$env:PERFORMANCE_DATABASE_URL="postgresql://..."
psql $env:PERFORMANCE_DATABASE_URL
```

Inside `psql`, capture JSON plans with:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
<query>;
```

Record only aggregate plan fields:

- scenario
- operation
- principal node type
- index name when present
- total cost
- planning time
- execution time
- estimated rows
- actual rows
- notes

Do not copy result rows, documents, phones, emails, addresses, passwords, tokens, or contacts.

## Critical Search Scenarios

The T165 benchmark measures nine read-only search scenarios. The table below documents the
query-plan target and current decision for each one.

| Scenario | Operation | Expected index use | Cost/time status | Decision |
| --- | --- | --- | --- | --- |
| `deceased-name-partial` | Active links joined to deceased where `searchName contains` normalized token, ordered by deceased search fields, limit 100. | `BurialLink(status)` is not currently indexed alone; `Deceased(searchName)` may not help `contains` unless the planner can use a pattern-compatible strategy. | Not captured; performance DB unavailable. | Watch closely. If real plan shows sequential scan on 100000 deceased or slow sort, T168 should consider a PostgreSQL trigram or pattern index for `Deceased.searchName` and/or a status-leading active-link index. |
| `deceased-death-date` | Active links joined to deceased by exact `deathDate`, limit 100. | `Deceased(deathDate)` plus `BurialLink(deceasedId,status)`. | Not captured; performance DB unavailable. | Existing indexes are plausible. No structural change without real plan evidence. |
| `burial-date` | Active links where link burial date equals a date OR deceased burial date equals a date, limit 100. | `BurialLink(burialDate)` and `Deceased(burialDate)`; OR may require bitmap or split plan. | Not captured; performance DB unavailable. | If OR causes broad scans, T168 should consider splitting into two queries or adding a composite status/date index only with evidence. |
| `sector-filter` | Active links joined to burial spaces where `locationKey contains/endsWith` sector token, limit 100. | `BurialSpace(locationKey)` may help `endsWith` poorly and usually will not help leading-wildcard-like contains. | Not captured; performance DB unavailable. | Watch closely. If real plan scans many spaces, T168 should consider normalizing sector filter to the existing `sector` column or adding a pattern/trigram strategy for `locationKey`. |
| `burial-space-identifier` | Active links joined to burial space by exact `identifier`, limit 100. | `BurialSpace(identifier)` plus `BurialLink(burialSpaceId,status)`. | Not captured; performance DB unavailable. | Existing indexes are plausible. No change recommended without evidence. |
| `responsible-name` | Active links joined to responsible where `searchName contains` normalized token, limit 100. | `Responsible(searchName)` may not help `contains`; `BurialLink(responsibleId)` supports join after responsible filtering. | Not captured; performance DB unavailable. | Watch closely. If sequential scan is expensive, T168 should consider a trigram/pattern index for `Responsible.searchName`. |
| `deceased-document-exact` | Active links joined to deceased by exact document, limit 100. | `Deceased(document)` plus `BurialLink(deceasedId,status)`. | Not captured; performance DB unavailable. | Existing indexes are plausible. No change recommended without evidence. |
| `responsible-document-exact-empty` | Active links joined to responsible by exact document that returns no rows, limit 100. | `Responsible(document)` plus `BurialLink(responsibleId)` if a responsible is found. | Not captured; performance DB unavailable. | Existing indexes are plausible. No change recommended without evidence. |
| `location-detail-by-deceased` | First active link for one deceased UUID. | `BurialLink(deceasedId,status)`. | Not captured; performance DB unavailable. | Existing composite index directly matches the lookup. |

### SQL Templates For Search Plans

Use only synthetic constants from the T164 baseline.

```sql
-- deceased-name-partial
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
WHERE bl.status = 'ACTIVE'
  AND d."searchName" LIKE '%performance deceased 001%'
ORDER BY d."searchName" ASC, d."internalCode" ASC, bl.id ASC
LIMIT 100;

-- deceased-death-date
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
WHERE bl.status = 'ACTIVE'
  AND d."deathDate" = DATE '2022-11-03'
ORDER BY d."searchName" ASC, d."internalCode" ASC, bl.id ASC
LIMIT 100;

-- burial-date
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
WHERE bl.status = 'ACTIVE'
  AND (bl."burialDate" = DATE '2020-07-19' OR d."burialDate" = DATE '2020-07-19')
ORDER BY d."searchName" ASC, d."internalCode" ASC, bl.id ASC
LIMIT 100;

-- sector-filter
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
JOIN "BurialSpace" bs ON bs.id = bl."burialSpaceId"
WHERE bl.status = 'ACTIVE'
  AND (bs."locationKey" LIKE '%sector=performance%20sector%2001|%'
    OR bs."locationKey" LIKE '%sector=performance%20sector%2001')
ORDER BY d."searchName" ASC, d."internalCode" ASC, bl.id ASC
LIMIT 100;

-- burial-space-identifier
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
JOIN "BurialSpace" bs ON bs.id = bl."burialSpaceId"
WHERE bl.status = 'ACTIVE'
  AND bs.identifier = 'PERF-SEP-00123'
ORDER BY d."searchName" ASC, d."internalCode" ASC, bl.id ASC
LIMIT 100;

-- responsible-name
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
JOIN "Responsible" r ON r.id = bl."responsibleId"
WHERE bl.status = 'ACTIVE'
  AND r."searchName" LIKE '%performance responsible 00005%'
ORDER BY d."searchName" ASC, d."internalCode" ASC, bl.id ASC
LIMIT 100;

-- deceased-document-exact
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
WHERE bl.status = 'ACTIVE'
  AND d.document = 'PERFDECDOC000000012345'
ORDER BY d."searchName" ASC, d."internalCode" ASC, bl.id ASC
LIMIT 100;

-- responsible-document-exact-empty
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
JOIN "Responsible" r ON r.id = bl."responsibleId"
WHERE bl.status = 'ACTIVE'
  AND r.document = 'PERFRESPDOC000000000002'
ORDER BY d."searchName" ASC, d."internalCode" ASC, bl.id ASC
LIMIT 100;

-- location-detail-by-deceased
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
WHERE bl."deceasedId" = '16420000-0000-4000-8000-000000003039'
  AND bl.status = 'ACTIVE'
LIMIT 1;
```

## Critical Report Scenarios

The T166 benchmark measures the four administrative reports.

| Scenario | Operation | Expected index use | Cost/time status | Decision |
| --- | --- | --- | --- | --- |
| `deceased-report` | Page deceased records ordered by `createdAt desc`, `internalCode asc`; paired count. | No current `createdAt` index. Unique `internalCode` supports tie-break only. | Not captured; performance DB unavailable. | Watch closely. If sorting 100000 rows dominates, T168 should consider `Deceased(createdAt, internalCode)` or an order-compatible index. |
| `burials-by-period-report` | Active burial links in 2022 ordered by `burialDate desc`, deceased search name, id; paired count. | `BurialLink(burialDate)` supports date range; status is separate from date. | Not captured; performance DB unavailable. | If active/status filter remains expensive, T168 should consider `(status, burialDate)` or `(burialDate, status)` based on real selectivity. |
| `space-occupation-report` | Occupied jazigos in one sector with active-link existence and active-link count, ordered by type/identifier/location/id. | `BurialSpace(status,type)` and `BurialLink(burialSpaceId,status)`; `locationKey` contains/endsWith may be weak. | Not captured; performance DB unavailable. | Watch sector predicate. T168 should prefer measured evidence before adding a location or covering order index. |
| `space-status-report` | Available jazigos ordered by status/type/identifier/location/id with active-link count. | `BurialSpace(status,type)`; active-link count uses `BurialLink(burialSpaceId,status)`. | Not captured; performance DB unavailable. | Existing indexes are plausible. Consider order-covering index only if sort is measurable. |

### SQL Templates For Report Plans

```sql
-- deceased-report page
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT d.id
FROM "Deceased" d
ORDER BY d."createdAt" DESC, d."internalCode" ASC
LIMIT 100 OFFSET 0;

-- deceased-report count
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT COUNT(*) FROM "Deceased" d;

-- burials-by-period-report page
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bl.id
FROM "BurialLink" bl
JOIN "Deceased" d ON d.id = bl."deceasedId"
WHERE bl."burialDate" >= DATE '2022-01-01'
  AND bl."burialDate" < DATE '2023-01-01'
  AND bl.status = 'ACTIVE'
ORDER BY bl."burialDate" DESC, d."searchName" ASC, bl.id ASC
LIMIT 100 OFFSET 0;

-- burials-by-period-report count
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT COUNT(*)
FROM "BurialLink" bl
WHERE bl."burialDate" >= DATE '2022-01-01'
  AND bl."burialDate" < DATE '2023-01-01'
  AND bl.status = 'ACTIVE';

-- space-occupation-report page
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bs.id,
  (SELECT COUNT(*) FROM "BurialLink" blc WHERE blc."burialSpaceId" = bs.id AND blc.status = 'ACTIVE') AS active_count
FROM "BurialSpace" bs
WHERE bs.status = 'OCCUPIED'
  AND bs.type = 'JAZIGO'
  AND (bs."locationKey" LIKE '%sector=performance%20sector%2001|%'
    OR bs."locationKey" LIKE '%sector=performance%20sector%2001')
  AND EXISTS (
    SELECT 1
    FROM "BurialLink" bl
    WHERE bl."burialSpaceId" = bs.id
      AND bl.status = 'ACTIVE'
  )
ORDER BY bs.type ASC, bs.identifier ASC, bs."locationKey" ASC, bs.id ASC
LIMIT 100 OFFSET 0;

-- space-occupation-report count
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT COUNT(*)
FROM "BurialSpace" bs
WHERE bs.status = 'OCCUPIED'
  AND bs.type = 'JAZIGO'
  AND (bs."locationKey" LIKE '%sector=performance%20sector%2001|%'
    OR bs."locationKey" LIKE '%sector=performance%20sector%2001')
  AND EXISTS (
    SELECT 1
    FROM "BurialLink" bl
    WHERE bl."burialSpaceId" = bs.id
      AND bl.status = 'ACTIVE'
  );

-- space-status-report page
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT bs.id,
  (SELECT COUNT(*) FROM "BurialLink" blc WHERE blc."burialSpaceId" = bs.id AND blc.status = 'ACTIVE') AS active_count
FROM "BurialSpace" bs
WHERE bs.status = 'AVAILABLE'
  AND bs.type = 'JAZIGO'
ORDER BY bs.status ASC, bs.type ASC, bs.identifier ASC, bs."locationKey" ASC, bs.id ASC
LIMIT 100 OFFSET 0;

-- space-status-report count
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT COUNT(*)
FROM "BurialSpace" bs
WHERE bs.status = 'AVAILABLE'
  AND bs.type = 'JAZIGO';
```

## Recommendations For T168

These are recommendations only. T167 does not apply any structural change.

1. Do not create migrations until the templates above are executed against the isolated performance
   baseline and the benchmark output identifies a slow scenario.
2. Prioritize evidence for these likely pressure points:
   - contains searches on `Deceased.searchName` and `Responsible.searchName`;
   - sector/location filters using `BurialSpace.locationKey` contains/endsWith;
   - `Deceased` report ordering by `createdAt desc` without a matching index;
   - burial-period report filtering by `status` plus `burialDate`.
3. Candidate changes for T168, if real plans justify them:
   - pattern/trigram index strategy for normalized names;
   - use direct normalized `sector` filters or a pattern/trigram strategy for `locationKey`;
   - order-compatible index for `Deceased(createdAt, internalCode)`;
   - composite status/date index for `BurialLink`.
4. Existing indexes appear sufficient for exact document lookup, exact space identifier lookup,
   detail-by-deceased lookup, and active-link counts by space.

## Completion Decision

T167 documents the critical query-plan targets and decisions without executing real analysis in this
workspace because no performance database URL is configured. T168 remains the task that may apply a
minimal migration after real `EXPLAIN ANALYZE` evidence exists.

## T168 Index Adjustment Decision

T168 reviewed this analysis, the Prisma schema, and the existing initial migration. No new migration
was created.

Decision: do not alter indexes in T168.

Rationale:

- T167 did not capture real `EXPLAIN ANALYZE` output because `PERFORMANCE_DATABASE_URL` was not
  configured in the workspace.
- The current evidence is static: it identifies likely pressure points and candidate indexes, but it
  does not prove a slow plan, high cost, excessive rows scanned, or benchmark failure.
- The local T168 task allows an index migration only when justified; without measured query-plan
  evidence, a structural database change would be speculative.
- Existing indexes already cover exact document lookup, exact space identifier lookup,
  detail-by-deceased lookup, active-link counts by space, date fields, and primary status/type
  filters.

Follow-up for T169/T168 replay:

1. Run the T165 and T166 benchmarks only against the isolated performance database.
2. Capture `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for any slow scenario using the templates above.
3. Create a minimal T168-style migration only if the captured plan shows a concrete bottleneck and a
   single index addresses it without changing data, rules, services, routes, or privacy behavior.
