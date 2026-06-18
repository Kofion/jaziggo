<!--
Sync Impact Report
- Version change: template (unratified) -> 1.0.0
- Modified principles:
  - Placeholder Principle 1 -> I. Existing Application and Repository Boundaries
  - Placeholder Principle 2 -> II. Internal Administrative Scope
  - Placeholder Principle 3 -> III. Authentication and Role-Based Access
  - Placeholder Principle 4 -> IV. Privacy and Data Integrity
  - Placeholder Principle 5 -> V. Defined Stack and Initial-Scope Simplicity
- Added sections:
  - Product and Technical Constraints
  - Development Workflow and Quality Gates
- Removed sections: none
- Templates reviewed without changes:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ .specify/templates/commands/ (directory absent; no command templates to update)
- Runtime guidance reviewed without changes:
  - ✅ AGENTS.md
  - ✅ docs/prd-jaziggo.md
  - ✅ docs/techspec-jaziggo.md
- Follow-up TODOs: none
-->
# Jaziggo Constitution

## Core Principles

### I. Existing Application and Repository Boundaries
The project name MUST be written as **Jaziggo**. The repository root is `JAZIGGO/`, and the
existing Next.js application is located at `JAZIGGO/jaziggo/`. All application work MUST extend
that existing application. Contributors and automation MUST NOT initialize, scaffold, or create a
second Next.js application elsewhere in the repository. Plans and tasks MUST use paths relative to
these established boundaries. This prevents duplicate applications, conflicting configuration, and
fragmented ownership.

### II. Internal Administrative Scope
Jaziggo MUST remain an internal administrative web application for cemetery management. Its direct
users are authenticated cemetery administrators and employees. Family members, responsible parties,
and visitors MUST NOT receive accounts or direct system access in the initial scope. A location
search requested by a family member or visitor MUST be performed by an authorized employee or
attendant, who communicates only the information required for that service. This boundary preserves
the internal nature of the product and limits unnecessary exposure of cemetery records.

### III. Authentication and Role-Based Access
Every administrative page, operation, and endpoint MUST require authentication, except the minimum
functionality needed to establish a session. Authorization MUST be enforced on the server according
to exactly the `ADMIN` and `EMPLOYEE` profiles; hiding interface controls alone is insufficient.
`ADMIN` MUST control user management and administrative reports. `ADMIN` and `EMPLOYEE` MAY perform
authorized operational registration, consultation, update, search, and location workflows. Specs,
plans, implementations, and tests MUST state and verify the permitted profile for each protected
capability.

### IV. Privacy and Data Integrity
Personal data about deceased people, responsible parties, and system users MUST be collected,
returned, displayed, and logged only when required by an authorized workflow. Interfaces, search
results, reports, errors, and logs MUST NOT expose personal data unnecessarily. Server-side
validation and database constraints MUST preserve required fields, relationships, occupancy rules,
and historical records. Access-control and privacy failures are release-blocking defects because the
system holds sensitive personal and administrative information.

### V. Defined Stack and Initial-Scope Simplicity
The application stack MUST be Next.js and TypeScript, with PostgreSQL as the relational database and
Prisma ORM as its data-access layer. Alternative application frameworks, databases, or ORMs require
a constitution amendment before adoption. The initial scope MUST NOT depend on external integrations;
any future integration requires its own specification, security analysis, failure strategy, and
approval. Administrative reports MUST be viewed inside Jaziggo; mandatory export, email, external BI,
or third-party reporting is outside the initial scope. This constraint keeps delivery aligned with
the approved architecture and avoids unsupported complexity.

## Product and Technical Constraints

- The supported domains are authentication and users, deceased records, burial spaces and tombs,
  responsible parties, burial links and history, location search, and administrative reports.
- PostgreSQL MUST be the source of truth for persistent domain data, and Prisma migrations MUST make
  schema evolution explicit and reviewable.
- Location responses MUST disclose only the minimum information needed for an employee or attendant
  to guide a family member or visitor.
- Reports MUST respect the same authentication, authorization, and privacy rules as operational
  screens. In the initial scope, administrative reports are restricted to `ADMIN`.
- Requirements that imply public access, a new application, a different core stack, or a mandatory
  external service conflict with this constitution and MUST NOT proceed without an amendment.

## Development Workflow and Quality Gates

- Before planning or implementation, contributors MUST read the repository-root `AGENTS.md` and the
  current Spec Kit plan identified by it.
- Before writing or changing Next.js code, contributors MUST consult the relevant documentation in
  `jaziggo/node_modules/next/dist/docs/` and follow the installed version's guidance.
- Each plan MUST pass a Constitution Check covering repository location, internal scope, roles,
  authentication, privacy, stack, reporting, and external-integration boundaries before research and
  again after design.
- Feature specifications MUST define independently testable acceptance scenarios and explicit role
  permissions. Plans and tasks MUST include tests proportional to risk, with direct coverage for
  authentication, authorization, personal-data exposure, domain integrity, and critical workflows.
- Changes MUST remain inside the existing `jaziggo/` application unless they are documentation or
  repository-level Spec Kit artifacts. Any exception MUST be documented and approved before work.
- A review MUST block delivery when code, schema, tests, or documentation violates this constitution.

## Governance

This constitution is the highest project-level authority for product scope and engineering
constraints. When the PRD, technical specification, plan, task list, or implementation conflicts
with it, the constitution governs until an approved amendment resolves the conflict.

Amendments MUST be documented in this file, explain their impact, update dependent artifacts when
needed, and receive explicit project-owner approval. Versions follow semantic versioning: MAJOR for
incompatible principle or governance changes, MINOR for new principles or materially expanded
requirements, and PATCH for clarifications that do not change obligations. The Sync Impact Report
MUST accompany every amendment.

Every feature plan and code review MUST verify compliance. Unjustified violations MUST block work;
approved exceptions MUST be explicit, narrowly scoped, time-bound when applicable, and recorded in
the relevant plan's Complexity Tracking section. Governance review uses `AGENTS.md`, the current
plan, and this constitution as mandatory guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-18 | **Last Amended**: 2026-06-18
