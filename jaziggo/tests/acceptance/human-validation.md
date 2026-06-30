# Human Validation Protocol: SC-002, SC-004 and SC-010

## Status

- Execution status: pending human validation.
- Release decision: blocked until this protocol is executed with representative participants.
- Result data: no real participant results are recorded in this file.
- Data policy: use only synthetic operational records and anonymous participant IDs such as `P01`,
  `P02` and `P03`.

This protocol prepares the moderated, timed validation required for SC-002, SC-004 and SC-010. It
does not claim that the validation has already passed. Any execution notes must remain aggregated
or anonymized and must not include real names, documents, phone numbers, emails, addresses, tokens or
credentials.

## Scope

| Criterion | Validation goal | Acceptance threshold |
|-----------|-----------------|----------------------|
| SC-002 | Participants register a deceased record and link it to a valid burial space. | At least 90% complete in 5 minutes or less without external help. |
| SC-004 | Simulated service requests locate the correct record and produce location guidance. | At least 90% complete in 2 minutes or less. |
| SC-010 | Administrators and employees evaluate navigation, messages and location presentation. | At least 80% rate clarity and satisfaction as 4 or 5 on a 1-5 scale. |

The protocol aligns with the T159, T160 and T161 E2E flows:

- T159: registration lookup, homonym differentiation, location search and masked documents.
- T160: occupancy status, blocked status changes and historical link closure as supporting
  observations for registration/link integrity.
- T161: administrative reports, clear empty states, masked documents and `ADMIN`-only report access.

## Participants

- Recruit representative internal users only: `ADMIN` and `EMPLOYEE`.
- Do not create an `ATTENDANT` role. If an attendant profile is simulated, record it as
  `EMPLOYEE`.
- Family members, visitors and responsible parties have no direct system access. External service
  requests must be simulated by the facilitator and performed in Jaziggo by an authenticated
  `ADMIN` or `EMPLOYEE`.
- Identify participants only as `P01`, `P02`, `P03` and so on.
- Record role, previous familiarity with Jaziggo and completion metrics; do not record names,
  documents, contact details or addresses.

Use at least 10 participants when possible so the 90% and 80% thresholds can be interpreted without
fractional ambiguity. A smaller sample is allowed only for rehearsal and must be marked
inconclusive.

## Environment And Data

- Use an isolated validation environment, never production.
- Use synthetic deceased, responsible and burial-space records.
- Documents used in scenarios must be fake values and must be checked only for masking in UI
  results.
- Do not paste complete documents, phone numbers, emails or addresses into notes or screenshots.
- Confirm the maximum visible page size remains 100 results where paginated lists or reports are
  involved.

## Scenario Script

### Scenario A: Register And Link A Deceased Record

- Role: `EMPLOYEE` or `ADMIN`.
- Measures: SC-002 and supporting integrity observations from T160.
- Time limit: 5 minutes.

Steps:

1. Start the timer after login and scenario briefing.
2. Create a deceased record with a synthetic full name and permitted date fields.
3. Select or create a valid available burial space using synthetic location components.
4. Link the deceased record to the valid burial space.
5. Verify that the link is active and the space occupancy is updated.
6. Stop the timer when the participant confirms the correct linked record and location.

Success requires correct record creation, a valid active link, correct occupancy status and no
external help. A privacy failure, invalid role, unresolved error or facilitator intervention counts
as failure.

### Scenario B: Locate The Correct Record

- Role: `EMPLOYEE` or `ADMIN`.
- Measures: SC-004 and supporting privacy observations from T159.
- Time limit: 2 minutes.

Steps:

1. Start the timer after the facilitator gives a synthetic service request.
2. Search by partial name or internal code.
3. If homonyms are present, use internal code, dates, responsible summary and location to identify
   the correct record.
4. Provide location guidance using only the required location information.
5. Confirm that documents are masked and complete documents or contacts are not exposed in results.
6. Stop the timer when the participant provides the correct guidance.

Success requires the correct record, correct guidance, elapsed time within 2 minutes and no direct
system access by family members, visitors or responsible parties.

### Scenario C: Review Reports And Clarity

- Role: `ADMIN` for report access, with `EMPLOYEE` attempts observed only to confirm blocked access
  when included.
- Measures: SC-010 and supporting report observations from T161.
- Time limit: record elapsed time, but SC-010 is scored by ratings rather than a hard duration.

Steps:

1. Open the administrative reports area as `ADMIN`.
2. Review the four report views: deceased, burials by period, space occupation and space status.
3. Apply at least one period, status, sector or type filter.
4. Review an empty-state case.
5. Confirm reports remain inside the application and do not expose complete documents.
6. Ask the participant to rate navigation clarity, message clarity, location presentation clarity
   and overall satisfaction.

Ratings use a 1-5 scale:

- 1: very unclear or unsatisfactory.
- 2: unclear.
- 3: neutral or needs improvement.
- 4: clear or satisfactory.
- 5: very clear or very satisfactory.

SC-010 passes when at least 80% of clarity and satisfaction responses are 4 or 5.

## Collection Template

### Participant Register

| Participant ID | Role | Prior familiarity | Validation date | Notes |
|----------------|------|-------------------|-----------------|-------|
| P01 | ADMIN or EMPLOYEE | None / Low / Medium / High | Pending | Synthetic data only |
| P02 | ADMIN or EMPLOYEE | None / Low / Medium / High | Pending | Synthetic data only |

### Timed Task Results

| Participant ID | Scenario | Started at | Ended at | Elapsed seconds | Success | Help needed | Error count | Safe notes |
|----------------|----------|------------|----------|-----------------|---------|-------------|-------------|------------|
| P01 | SC-002 registration/link | Pending | Pending | Pending | Pending | Pending | Pending | No personal data |
| P01 | SC-004 location guidance | Pending | Pending | Pending | Pending | Pending | Pending | No personal data |

### Clarity And Satisfaction Results

| Participant ID | Navigation clarity | Message clarity | Location clarity | Satisfaction | Safe notes |
|----------------|--------------------|-----------------|------------------|--------------|------------|
| P01 | Pending | Pending | Pending | Pending | No personal data |

## Scoring

Use these formulas after real execution:

- SC-002 success rate: successful registration/link tasks without help divided by attempted
  registration/link tasks.
- SC-004 success rate: correct location-guidance tasks within 2 minutes divided by attempted
  location-guidance tasks.
- SC-010 clarity rate: ratings of 4 or 5 for navigation, messages and location presentation divided
  by total clarity ratings.
- SC-010 satisfaction rate: ratings of 4 or 5 divided by total satisfaction ratings.

Release is blocked when any of these conditions is true:

- SC-002 success rate is below 90%.
- SC-004 success rate is below 90%.
- SC-010 clarity or satisfaction is below 80%.
- Any real personal data, complete document, phone, email, address, password, token or secret appears
  in notes, screenshots, logs, reports or exported evidence.
- Family members, visitors or responsible parties receive direct system access.

## Execution Record

| Field | Value |
|-------|-------|
| Protocol prepared at | 2026-06-30 |
| Execution status | Pending |
| Participants completed | 0 |
| SC-002 status | Pending |
| SC-004 status | Pending |
| SC-010 status | Pending |
| Release gate | Blocked until real moderated validation is recorded |

When the protocol is executed, replace only the pending aggregate fields with anonymized aggregate
results. Keep individual rows anonymous and remove any operational detail that could identify a real
person.