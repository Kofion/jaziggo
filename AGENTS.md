# Jaziggo Repository Instructions

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/001-cemetery-management/plan.md
<!-- SPECKIT END -->

## Project context

This repository contains the Jaziggo project.

The repository root is `JAZIGGO/`.
The existing Next.js application is inside `jaziggo/`.
Do not create another Next.js application.

Primary documentation:
- `docs/prd-jaziggo.md`
- `docs/techspec-jaziggo.md`
- `.specify/memory/constitution.md`
- `specs/001-cemetery-management/spec.md`

Before planning or implementing, read and follow these files.

## Spec Kit workflow

Use the GitHub Spec Kit artifacts as the source of truth for planning and implementation.

Expected flow:
1. Constitution
2. Specify
3. Clarify
4. Checklist
5. Plan
6. Tasks
7. Analyze
8. Implement

Do not implement code before the plan and tasks are generated and reviewed.

## Product constraints

- The product name is Jaziggo.
- Jaziggo is an internal administrative web application for cemetery management.
- Direct users are authenticated `ADMIN` and `EMPLOYEE` users.
- Family members, visitors, and responsible parties do not have direct system access.
- Location search requested by family members or visitors is performed by an authorized employee or attendant.
- Attendant is an operational role description for an `EMPLOYEE`, not a separate access profile.
- Personal data must not be exposed unnecessarily.
- Documents must be masked in search results, showing only the last four characters.
- Full documents may be used as exact search filters but must not be displayed completely in results.

## Technical constraints

- Use the existing Next.js application in `jaziggo/`.
- Use Next.js with TypeScript.
- Use PostgreSQL as the relational database.
- Use Prisma ORM for data access and migrations.
- Do not introduce mandatory external integrations in the initial scope.
- Reports are viewed inside the application in the initial scope.

## Next.js guidance

Before writing or changing Next.js code, read the relevant installed Next.js documentation in:

- `jaziggo/node_modules/next/dist/docs/`

The installed Next.js version is the source of truth for APIs, conventions, and file structure.
