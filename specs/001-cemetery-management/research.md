# Technical Research: Gestão Administrativa de Cemitérios do Jaziggo

**Date**: 2026-06-18  
**Sources**: feature spec, constitution, PRD, Tech Spec, package manifest and installed Next.js 16.2.9
documentation under `jaziggo/node_modules/next/dist/docs/`.

## 1. Existing Application Boundary

**Decision**: Extend only `JAZIGGO/jaziggo/`; do not run `create-next-app` or create a parallel
frontend/backend project.

**Rationale**: The repository already contains Next.js 16.2.9, React 19.2.4, TypeScript 5 and App
Router. This is mandatory in the constitution and avoids duplicate configuration and deployment.

**Alternatives considered**: New Next.js application, separate React frontend, separate Express API.
All were rejected as constitution violations or unnecessary complexity.

## 2. Full-stack Architecture

**Decision**: Use a modular monolith with App Router UI, internal REST Route Handlers under
`/api/v1`, domain services, Prisma-backed data access and explicit DTOs.

**Rationale**: It follows the Tech Spec, keeps one deployable application and preserves separation
between HTTP, domain rules and persistence. The REST surface also provides a stable testable contract.

**Alternatives considered**: Server Actions only, GraphQL, independent API service. Server Actions
only would leave the specified REST contract unfulfilled; the other options add scope without value.

## 3. Authentication and Session Management

**Decision**: Use Auth.js with an internal credentials provider and signed cookie session. Store
password hashes with Argon2id. On every protected operation, resolve the current user from PostgreSQL
and reject inactive users before checking `ADMIN` or `EMPLOYEE` permissions.

**Rationale**: The installed Next.js authentication guide recommends an authentication library over
custom security code. Internal credentials satisfy the no-external-integration constraint. Server-side
user resolution provides immediate account deactivation even when a previously issued cookie exists.

**Alternatives considered**: Fully custom session implementation, external identity provider, public
registration. Custom auth increases security risk; external identity and public registration are out
of scope.

## 4. Server-side Authorization

**Decision**: Centralize secure authorization in a server-only data access/service layer and repeat
permission checks at each Route Handler or mutation. Navigation guards are optimistic UX only.

**Rationale**: Next.js local guidance states not to rely on route interception alone and recommends
DTOs plus a DAL. This protects direct HTTP calls and minimizes accidental data exposure.

**Alternatives considered**: Hide buttons only; enforce roles only in a proxy/middleware. Both leave
server operations vulnerable.

## 5. Validation and API Errors

**Decision**: Define shared Zod schemas at the HTTP boundary and repeat invariant checks in domain
services. Return a stable envelope with machine code, safe message, optional field errors and
`requestId`; use HTTP 400/401/403/404/409/422/500 consistently.

**Rationale**: Input shape validation and business invariant validation fail for different reasons.
Stable errors improve forms, tests and incident investigation without leaking internals.

**Alternatives considered**: Prisma errors directly to clients; UI-only validation. Both are unsafe
and insufficient for direct requests.

## 6. Relational Model and Concurrency

**Decision**: Use PostgreSQL with Prisma migrations. Enforce uniqueness and referential integrity in
the database, and perform link creation/closure plus space status recalculation in serializable
transactions with bounded retry on serialization conflict.

**Rationale**: Two users can attempt to occupy the last capacity concurrently. A read followed by an
unprotected write can exceed capacity; a transaction makes capacity and status one atomic decision.

**Alternatives considered**: Client-side checks, eventual reconciliation, cached active counts.
These permit invalid occupancy or introduce unnecessary state.

## 7. Occupancy State Model

**Decision**: Sepultura capacity is always 1. Jazigo capacity is a required positive integer.
`AVAILABLE` requires zero active links; `OCCUPIED` requires at least one and may remain below jazigo
capacity; `RESERVED` and `INACTIVE` require zero active links and block new links. Ending a link never
deletes it and records `endedAt` and `endReason`.

**Rationale**: This is the clarified functional decision and makes every transition testable.

**Alternatives considered**: One active deceased for all spaces, unlimited jazigo, physical deletion.
All contradict clarified requirements or weaken integrity.

## 8. Personal Documents and DTOs

**Decision**: Normalize documents for exact lookup, keep the full stored value server-side, and
return only `documentMasked` from list/search/report DTOs. Mask all but the final four characters;
never log the value or filter. Use explicit field selection rather than serializing Prisma records.

**Rationale**: Exact lookup remains useful while outputs comply with privacy constraints and Next.js
DTO guidance.

**Alternatives considered**: Full document in authenticated results, omit document search, hash-only
storage. The first exposes data; the second breaks RF031; hash-only complicates legitimate updates
and is not required for initial scope.

## 9. Search, Pagination and Scale

**Decision**: Normalize searchable text, index document, names, dates, space identifier, sector,
status and active-link foreign keys. Use page-based pagination with default 25 and maximum 100.
Validate against a baseline of 100,000 deceased and links, 25,000 spaces and 50 concurrent sessions.
Do not introduce a search engine or cache initially.

**Rationale**: PostgreSQL indexes satisfy the initial single-cemetery scope and avoid an external
dependency. Metrics will identify whether later optimization is justified.

**Alternatives considered**: Elasticsearch, fuzzy-search service, mandatory Redis. All add external
infrastructure before measured need.

## 10. Test Strategy

**Decision**: Use Vitest for domain services and synchronous components, React Testing Library for UI
behavior, PostgreSQL test database for integration, contract validation against OpenAPI and Playwright
for login/RBAC and critical App Router journeys. Async Server Components are validated through E2E.

**Rationale**: This matches the installed Next.js testing guides and the Tech Spec's risk-based split.

**Alternatives considered**: Unit tests only; browser tests only; mocks for all persistence. Each
leaves important security, relational or UI behavior uncovered.

## 11. Observability and Availability

**Decision**: Start with structured JSON logs, request correlation, liveness/readiness endpoints and
basic in-process Prometheus-format metrics. Protect or network-restrict metrics. Grafana, Prometheus
scraping and alert delivery remain optional deployment integrations.

**Rationale**: This exposes enough signals for failures and performance targets without blocking the
initial release on a full observability platform. Logs contain IDs, not documents or contact data.

**Alternatives considered**: No observability; mandatory full telemetry stack. The first impedes
operations; the second violates the simplicity goal.

## 12. Reports and Integrations

**Decision**: Generate paginated/filterable report views from internal PostgreSQL data and render them
inside authenticated `ADMIN` pages. No export, notification, maps or third-party business API.

**Rationale**: This exactly matches the initial PRD and constitution.

**Alternatives considered**: PDF/CSV export, external BI, public reports. Deferred as out of scope.

## 13. Deployment Portability and Recovery

**Decision**: Keep runtime compatible with any Node.js host supporting Next.js and PostgreSQL. Require
HTTPS, separated environments, documented variables, migration control, database backups and a
tested restore procedure before production release.

**Rationale**: Avoids vendor lock-in and addresses availability at the level appropriate for an
internal first release.

**Alternatives considered**: Vercel-only architecture, no recovery validation. Both create avoidable
operational risk.

## Resolution Status

All planning unknowns that affect data modeling, contracts, security, testing and operational
readiness are resolved. Production hosting, numeric uptime SLO and backup retention remain deployment
policy decisions; they do not block task generation because the architecture is provider-neutral and
defines health checks plus recovery gates.

