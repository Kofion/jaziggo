# MVP Functional Acceptance Validation: SC-002, SC-004 and SC-010

## Status

- Validation type: functional and documentary acceptance for the academic MVP.
- Empirical user validation: not performed in this TCC stage.
- Release decision for MVP scope: accepted through requirements-derived scenarios, automated gates and sanitized documentation.
- Limitation: validation with real administrators and employees is recommended as future work before production adoption.
- Data policy: use only synthetic operational records and aggregate evidence. Do not record real names, documents, phone numbers, emails, addresses, tokens, credentials or connection strings.

This document replaces the previous requirement for moderated, timed validation with real participants.
For this MVP, SC-002, SC-004 and SC-010 are evaluated through controlled functional acceptance
scenarios derived from the specification, supported by the automated E2E flows from T159, T160 and
T161. No participants, elapsed times, satisfaction scores or human-study results are invented here.

## Scope

| Criterion | MVP validation goal | Acceptance basis |
|-----------|---------------------|------------------|
| SC-002 | Confirm that an authenticated internal user can register and link a deceased record to a valid burial space. | Functional scenario review plus E2E coverage for registration/link integrity. |
| SC-004 | Confirm that an authenticated internal user can locate the correct record and provide location guidance without public access. | Functional scenario review plus E2E coverage for location search, homonyms and masking. |
| SC-010 | Confirm that navigation, messages, reports and empty states are clear enough for MVP demonstration. | Functional scenario review plus E2E accessibility/feedback/report coverage. |

The acceptance record aligns with the following implemented flows:

- T159: registration lookup, homonym differentiation, location search and masked documents.
- T160: occupancy status, blocked status changes and historical link closure as supporting
  observations for registration/link integrity.
- T161: administrative reports, clear empty states, masked documents and `ADMIN`-only report access.
- T162/T163: keyboard access, labels, focus, contrast, loading/empty/error/success feedback and
  sensitive-operation confirmations.

## Roles And Access Boundaries

- Evaluated direct roles: `ADMIN` and `EMPLOYEE` only.
- `ATTENDANT` is not a role and was not introduced; attendant-like operational behavior is covered
  by `EMPLOYEE`.
- Family members, visitors and responsible parties have no account and no direct system access.
- External service requests are represented as controlled scenarios performed inside Jaziggo by an
  authenticated `ADMIN` or `EMPLOYEE`.
- No real participants were recruited, observed or measured in this MVP validation record.

## Environment And Data

- Validation is based on isolated development/test environments and synthetic records.
- Documents used by scenarios are fake values and are checked only for masking behavior.
- Evidence must remain aggregate or documentary. Do not paste complete documents, phone numbers,
  emails, addresses, tokens, credentials or hostnames into notes or screenshots.
- Paginated lists and reports must respect the maximum visible page size of 100 records.

## Functional Acceptance Scenarios

### Scenario A: `EMPLOYEE` Registers And Links A Deceased Record

Purpose: validate SC-002 for operational registration.

Acceptance checks:

1. `EMPLOYEE` can access operational modules after authentication.
2. A deceased record with valid required fields can be represented with synthetic data.
3. A valid burial space can be associated according to capacity/status rules.
4. The active burial link is preserved and the burial-space occupancy state is updated.
5. Invalid duplicate capacity or blocked status transitions are rejected without partial data.
6. No public/family/visitor access is created during the flow.

Supporting evidence: T159/T160 E2E flows and integration tests for burial links, capacity and
historical closure.

### Scenario B: `EMPLOYEE` Locates A Record For Service Guidance

Purpose: validate SC-004 for internal location service.

Acceptance checks:

1. `EMPLOYEE` can search by non-sensitive filters such as name, internal code, dates or location.
2. Homonyms can be differentiated using internal code, dates, responsible summary and location.
3. Complete document searches use protected POST bodies and are not persisted in URLs.
4. Result documents are masked and complete documents/contacts are not exposed in the UI.
5. Location guidance can be derived from the internal result without direct access by family
   members, visitors or responsible parties.

Supporting evidence: T159 E2E flow, location-search integration tests and privacy unit tests.

### Scenario C: `ADMIN` Reviews Internal Reports

Purpose: validate SC-010 for administrative report clarity and access boundaries.

Acceptance checks:

1. `ADMIN` can access the four internal report views.
2. Filters for period, status, sector and type can be applied where relevant.
3. Empty states remain textual and clear.
4. Reports remain inside the application and do not expose complete documents.
5. `EMPLOYEE` is denied administrative report access.
6. No mandatory export action or external reporting integration is required.

Supporting evidence: T161 E2E flow, report integration tests and OpenAPI contract validation.

### Scenario D: `ADMIN` And `EMPLOYEE` Validate MVP Usability Signals

Purpose: validate SC-010 through controlled usability-related checks without claiming empirical
human satisfaction.

Acceptance checks:

1. Login and protected navigation are keyboard reachable.
2. Critical forms expose accessible labels and visible focus.
3. Errors and empty states are textual and do not rely only on color.
4. Loading, success and confirmation states are present for critical flows.
5. The application entry point `/` redirects to `/login`, preserving the internal access boundary.

Supporting evidence: T162/T163 E2E flows and the T173 final E2E run.

## Academic Transparency And Future Work

This MVP validation is not a formal usability study and does not contain empirical participant data.
It does not measure real user completion rates, task times, satisfaction scores or statistical
confidence. Those activities are explicitly deferred to future work, where representative cemetery
administrators and employees can be recruited under an approved study protocol using synthetic or
properly governed data.

Future empirical validation should record only anonymized aggregate results and should continue to
block release if any personal data, complete document, phone, email, address, password, token or
secret appears in study notes, screenshots, logs or reports.

## Acceptance Record

| Field | Value |
|-------|-------|
| Record prepared at | 2026-06-30 |
| Validation type | Functional/documentary acceptance for academic MVP |
| Real participants | None |
| Invented participant results | None |
| SC-002 status | Accepted for MVP through Scenario A and automated/integration evidence |
| SC-004 status | Accepted for MVP through Scenario B and automated/integration evidence |
| SC-010 status | Accepted for MVP through Scenarios C/D and accessibility/feedback/report evidence |
| Direct roles covered | `ADMIN`, `EMPLOYEE` |
| `ATTENDANT` role introduced | No |
| Public/family/visitor access introduced | No |
| Evidence policy | Synthetic and aggregate only |
| Limitation | Real-user validation deferred to future work |
| MVP release gate | Accepted for academic MVP scope |
