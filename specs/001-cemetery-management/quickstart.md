# Quickstart Validation Guide: Jaziggo Cemetery Management

This guide describes how to validate the planned feature after implementation. It does not authorize
creating a new application: every command runs inside the existing `JAZIGGO/jaziggo/` directory.

## References

- Functional requirements: [spec.md](./spec.md)
- Technical plan: [plan.md](./plan.md)
- Data rules: [data-model.md](./data-model.md)
- HTTP contract: [contracts/openapi.yaml](./contracts/openapi.yaml)
- Installed Next.js guidance: `jaziggo/node_modules/next/dist/docs/`

## Prerequisites

- Node.js >= 20.9.0 and npm.
- Accessible PostgreSQL databases dedicated to development and test.
- Environment values for database URLs, authentication secret and initial administrator.
- Optional infrastructure token if readiness and metrics endpoints are exposed outside a private
  network.

Before implementation or validation changes involving Next.js, read the relevant installed guides,
especially authentication, Route Handlers, cookies, testing and instrumentation.

## Planned Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Development/runtime PostgreSQL connection. | Yes |
| `TEST_DATABASE_URL` | Isolated integration/E2E PostgreSQL connection. | Yes for tests |
| `AUTH_SECRET` | Signs authentication session material. | Yes |
| `INITIAL_ADMIN_EMAIL` | Creates or identifies the first administrator in seed. | Initial setup |
| `INITIAL_ADMIN_PASSWORD` | One-time initial credential; must be rotated. | Initial setup |
| `METRICS_ENABLED` | Enables the optional metrics endpoint. | No |
| `METRICS_TOKEN` | Restricts readiness/metrics outside a private network. | When enabled |

Secrets must not be committed, printed by scripts or written to application logs.

## Setup and Static Validation

The following scripts are expected to be added during implementation tasks:

```powershell
Set-Location jaziggo
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run lint
npm run typecheck
npm run build
```

Expected results:

- Existing Next.js application builds without creating another project.
- Prisma schema validates and migrations apply to PostgreSQL.
- Seed creates exactly the intended initial `ADMIN`, never a public account.
- No unresolved schema or TypeScript errors remain.

## Automated Test Suites

```powershell
Set-Location jaziggo
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:e2e
```

The integration command must refuse a database URL that matches development or production. Test data
must be reset between suites.

## Required Validation Scenarios

### 1. Authentication and RBAC

1. Log in as active `ADMIN`; confirm user management and reports are visible.
2. Log in as active `EMPLOYEE`; confirm operational modules and location search are visible.
3. Request user/report endpoints as `EMPLOYEE`; expect `403` even with direct HTTP calls.
4. Deactivate a logged-in employee; the next protected operation must return `401` and grant no data.
5. Confirm no `ATTENDANT` role exists; an attendant account is stored as `EMPLOYEE`.

### 2. Minimum Registration Fields

1. Create a deceased record with name and death date; expect success.
2. Create a historical record with name, no dates and `datesUnknown=true`; expect an internal code and
   incomplete-data indicator.
3. Omit dates and the unknown-date declaration; expect `422` with field errors.
4. Create a space with type, identifier, state and one location component; expect success.
5. Create a responsible with name plus one contact/identifier; expect success; name only must fail.

### 3. Occupancy and Concurrency

1. Create an `AVAILABLE` sepultura; capacity must be 1.
2. Create its first active link; status becomes `OCCUPIED`.
3. Attempt a second active link; expect `409` with no partial data.
4. Create a jazigo with capacity 2; first and second links succeed while status remains `OCCUPIED`.
5. Third link fails with `409`.
6. Execute two concurrent requests for the final jazigo slot; exactly one succeeds.
7. Confirm `RESERVED` and `INACTIVE` spaces reject all new links.

### 4. Historical Link Closure

1. End an active link with confirmation, timestamp and reason.
2. Confirm the record remains queryable with status `ENDED` and its closure fields.
3. Confirm a space with remaining active links stays `OCCUPIED`.
4. Confirm a space with no remaining active links becomes `AVAILABLE`, unless already `RESERVED` or
   `INACTIVE`.
5. Confirm there is no physical-delete endpoint for burial links.

### 5. Search and Privacy

1. Search by partial deceased name and by internal code.
2. Search by complete deceased/responsible document using the dedicated POST body and confirm exact
   matching; GET URLs must contain only non-sensitive filters.
3. Search a responsible by complete phone using the sensitive POST body; confirm it never enters the
   URL or list response.
4. Inspect request URLs, response body, page HTML, structured logs, metrics and errors: full documents
   must be absent from every surface except the encrypted transport body received by the server.
5. Confirm result documents show only the final four characters; values of four or fewer characters
   are fully masked.
5. Differentiate homonyms using internal code, incomplete-data indicator, dates, responsible and
   location without exposing unnecessary contact data.
6. Confirm family members, visitors and responsibles have no direct login or public search path.

### 6. Reports

1. As `ADMIN`, view each of the four report types and apply period/status/sector/type filters.
2. Compare totals with controlled database fixtures.
3. Use filters with no matches; expect a clear empty state.
4. Confirm reports remain inside the application and contain no export action.
5. Confirm `EMPLOYEE` receives `403` for all report endpoints.

### 7. Accessibility

Complete login, deceased registration, space registration, location search and report filtering with
keyboard only. Verify visible focus, labels, headings, table headers, readable contrast and errors
that do not rely only on color.

### 8. Performance Baseline

Load representative test data up to the baseline in [plan.md](./plan.md), then verify:

- At least 95% of location searches complete within 3 seconds.
- At least 95% of report views complete within 10 seconds.
- Pagination never returns more than 100 rows.
- Query plans use the intended indexes for common name, document, date, location and status filters.

### 9. Observability and Availability

1. Confirm liveness returns only process status and no environment detail.
2. Stop test database access; readiness must return unavailable while liveness remains available.
3. Confirm JSON logs include timestamp, level, request ID, module, operation, result and duration.
4. Confirm logs contain no passwords, hashes, tokens, documents, phone, email or address.
5. When metrics are enabled, confirm the endpoint is protected and exposes HTTP, auth, search,
   report, error and database health signals without personal labels.

### 10. Recovery Gate

Before production approval, create a backup from representative synthetic data and restore it into a
new isolated PostgreSQL database that cannot point to development or production. Apply pending
migrations safely, verify row counts and active/historical links, authenticate an administrator and
run a read-only smoke test. Record timestamp, commands, duration and results without credentials or
personal data. A failed or unverified restore blocks approval.

### 11. Human Validation

Run a moderated validation with representative administrators and employees:

1. At least 90% must register and link a deceased record in at most 5 minutes without assistance.
2. At least 90% must locate the correct record and provide location guidance in at most 2 minutes.
3. At least 80% must rate navigation, messages and location presentation as clear.
4. Record participant count, elapsed times, completion results and satisfaction responses without
   collecting unnecessary personal data.

Use the executable protocol and collection template in
`jaziggo/tests/acceptance/human-validation.md`. Until the moderated validation is run with anonymous
participants and synthetic data, SC-002, SC-004 and SC-010 remain pending and the human-validation
release gate is blocked. Family members, visitors and responsible parties must not receive direct
system access; any external service request is handled inside Jaziggo by an authenticated `ADMIN` or
`EMPLOYEE`.

## Completion Criteria

- All commands and scenarios above pass in an isolated environment.
- OpenAPI and implementation remain consistent.
- Constitution Check remains `PASS`.
- Security/privacy defects, capacity races and loss of historical links block release.
- No external business integration is required for the validated workflows.
- Success responses contain `success=true`, typed `data` and `requestId`; errors contain
  `success=false`, safe `error` and `requestId`.
