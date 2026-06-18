# Data Model: Gestão Administrativa de Cemitérios do Jaziggo

**Storage**: PostgreSQL  
**Access and migrations**: Prisma ORM  
**Source of truth**: [spec.md](./spec.md), clarifications of 2026-06-18

## Modeling Conventions

- Primary keys are UUIDs and are never exposed as personal identifiers.
- All timestamps are stored in UTC and rendered in the user's locale.
- Mutable entities carry `createdAt` and `updatedAt`.
- Records with historical or administrative value are not physically deleted.
- Documents are normalized for exact matching but are selected only inside server-side services.
  Client DTOs expose `documentMasked`, never the complete value.
- Invariants involving multiple records are enforced in a transaction; database constraints remain
  the final protection for single-row and referential rules.

## Enums

### UserRole

| Value | Meaning |
|-------|---------|
| `ADMIN` | Manages users, views reports and performs operational actions. |
| `EMPLOYEE` | Performs registration, update, linking, search and location actions. An attendant uses this role. |

No third access role is allowed in the initial scope.

### UserStatus

| Value | Meaning |
|-------|---------|
| `ACTIVE` | May authenticate, subject to role authorization. |
| `INACTIVE` | Authentication and all protected operations are denied. |

### BurialSpaceType

| Value | Meaning |
|-------|---------|
| `SEPULTURA` | Capacity is fixed at one active burial link. |
| `JAZIGO` | Capacity is the required positive value configured on the space. |

### BurialSpaceStatus

| Value | Meaning |
|-------|---------|
| `AVAILABLE` | Has zero active burial links and may accept a link. |
| `OCCUPIED` | Has one or more active links; a jazigo may still accept links below capacity. |
| `RESERVED` | Has zero active links and blocks new links. |
| `INACTIVE` | Has zero active links and blocks new links. |

### LinkStatus

| Value | Meaning |
|-------|---------|
| `ACTIVE` | Counts toward space capacity and occupancy. |
| `ENDED` | Historical only; does not count toward capacity. |

### ResponsibleLinkType

`DECEASED` or `BURIAL_SPACE`. Exactly one target foreign key must match the selected type.

## Entities

### User

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | UUID | Yes | Primary key. |
| `name` | String | Yes | Trimmed, non-empty. |
| `email` | String | Yes | Normalized lowercase; unique. |
| `passwordHash` | String | Yes | Argon2id hash; never returned or logged. |
| `role` | UserRole | Yes | Exactly `ADMIN` or `EMPLOYEE`. |
| `status` | UserStatus | Yes | Defaults to `ACTIVE`. |
| `createdAt` | DateTime | Yes | Generated. |
| `updatedAt` | DateTime | Yes | Updated automatically. |

**Indexes**: unique `email`; index `(status, role)` for administration.

**Lifecycle**: `ACTIVE -> INACTIVE`. Reactivation is not required by RF001-RF006 and needs a future
requirement before support. Deactivation does not remove historical ownership references.

### Deceased

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | UUID | Yes | Primary key. |
| `internalCode` | String | Yes | Generated, immutable and unique; shown to distinguish records. |
| `fullName` | String | Yes | Trimmed, non-empty. |
| `searchName` | String | Yes | Normalized derivative for case/diacritic-insensitive search. |
| `document` | String | No | Full normalized value, server-only. |
| `birthDate` | Date | No | Cannot be after known death or burial date. |
| `deathDate` | Date | Conditional | At least one of `deathDate`, `burialDate` or `datesUnknown=true`. |
| `burialDate` | Date | Conditional | Cannot precede known death date. |
| `datesUnknown` | Boolean | Yes | True only when both death and burial dates are absent. |
| `historicalDataIncomplete` | Boolean | Yes | True when document is absent or both operational dates are unknown. |
| `notes` | Text | No | Administrative note; excluded from list/search DTOs. |
| `createdAt` | DateTime | Yes | Generated. |
| `updatedAt` | DateTime | Yes | Updated automatically. |

**Indexes**: unique `internalCode`; `searchName`; `document`; `deathDate`; `burialDate`.

**Duplicate candidate rule**: Compare normalized name plus available dates/document. A match produces
an alert and candidate DTO, not an automatic block, because homonyms and incomplete records are valid.

### BurialSpace

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | UUID | Yes | Primary key. |
| `type` | BurialSpaceType | Yes | `SEPULTURA` or `JAZIGO`. |
| `identifier` | String | Yes | Trimmed, non-empty. |
| `locationKey` | String | Yes | Normalized derivative of populated location fields. |
| `sector` | String | Conditional | At least one location component is required. |
| `block` | String | Conditional | At least one location component is required. |
| `street` | String | Conditional | At least one location component is required. |
| `row` | String | Conditional | Represents quadra/fila when used locally. |
| `number` | String | Conditional | At least one location component is required. |
| `complement` | String | Conditional | May be the sole component only when it identifies the location clearly. |
| `status` | BurialSpaceStatus | Yes | Must agree with active-link count. |
| `capacity` | Integer | Yes | Exactly 1 for `SEPULTURA`; >=1 for `JAZIGO`. |
| `createdAt` | DateTime | Yes | Generated. |
| `updatedAt` | DateTime | Yes | Updated automatically. |

**Constraints**:

- Unique `(type, identifier, locationKey)`.
- At least one of `sector`, `block`, `street`, `row`, `number`, `complement` is non-empty.
- `type=SEPULTURA -> capacity=1`; `type=JAZIGO -> capacity>=1`.
- Creation may use `AVAILABLE`, `RESERVED` or `INACTIVE`. `OCCUPIED` is established atomically by an
  active link and cannot exist without one.

**Indexes**: `(status, type)`; `identifier`; `sector`; `locationKey`.

### Responsible

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | UUID | Yes | Primary key. |
| `fullName` | String | Yes | Trimmed, non-empty. |
| `searchName` | String | Yes | Normalized derivative for search. |
| `document` | String | Conditional | Full normalized value, server-only. |
| `phone` | String | Conditional | Normalized when present. |
| `email` | String | Conditional | Valid normalized email when present. |
| `address` | String | Conditional | Trimmed when present. |
| `createdAt` | DateTime | Yes | Generated. |
| `updatedAt` | DateTime | Yes | Updated automatically. |

At least one of `document`, `phone`, `email` or `address` is required in addition to `fullName`.

**Indexes**: `searchName`; `document`; `phone`.

### BurialLink

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | UUID | Yes | Primary key. |
| `deceasedId` | UUID | Yes | Foreign key to Deceased; restrict deletion. |
| `burialSpaceId` | UUID | Yes | Foreign key to BurialSpace; restrict deletion. |
| `responsibleId` | UUID | No | Optional principal responsible for this burial event. |
| `burialDate` | Date | No | May supplement the deceased record. |
| `status` | LinkStatus | Yes | Defaults to `ACTIVE`. |
| `endedAt` | DateTime | Conditional | Required exactly when `status=ENDED`. |
| `endReason` | String | Conditional | Required, trimmed and non-empty when `status=ENDED`. |
| `createdAt` | DateTime | Yes | Start of historical record. |
| `updatedAt` | DateTime | Yes | Updated automatically. |

**Constraints**:

- `ACTIVE -> endedAt IS NULL AND endReason IS NULL`.
- `ENDED -> endedAt IS NOT NULL AND endReason IS NOT NULL`.
- A deceased may not have two active links unless a future requirement explicitly allows it.
- Active links per space may not exceed `capacity`.
- No physical-delete operation is exposed.

**Indexes**: `(burialSpaceId, status)`; `(deceasedId, status)`; `responsibleId`; `burialDate`.

### ResponsibleLink

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | UUID | Yes | Primary key. |
| `responsibleId` | UUID | Yes | Foreign key; restrict deletion. |
| `linkType` | ResponsibleLinkType | Yes | Determines target. |
| `deceasedId` | UUID | Conditional | Set only for `DECEASED`. |
| `burialSpaceId` | UUID | Conditional | Set only for `BURIAL_SPACE`. |
| `status` | LinkStatus | Yes | Defaults to `ACTIVE`; historical removal uses `ENDED`. |
| `endedAt` | DateTime | Conditional | Required for ended link. |
| `endReason` | String | Conditional | Required for ended link. |
| `createdAt` | DateTime | Yes | Generated. |
| `updatedAt` | DateTime | Yes | Updated automatically. |

**Constraints**: Exactly one target is set and matches `linkType`; duplicate active relationship is
not allowed; `ACTIVE` requires `endedAt` and `endReason` nulos; `ENDED` requires both populated and a
non-empty `endReason` after trim;
ended relationships remain queryable and are never physically deleted.

## Relationships

```text
User (authentication/authorization only)

Deceased 1 ───< BurialLink >─── 1 BurialSpace
                     |
                     └── 0..1 Responsible (principal for burial event)

Responsible 1 ───< ResponsibleLink >─── exactly one of Deceased or BurialSpace
```

- One Deceased has zero or more historical BurialLinks and at most one active link in initial scope.
- One BurialSpace has zero or more historical links and up to `capacity` active links.
- One Responsible may relate to many deceased people and spaces.
- A Responsible is not a User and never gains access through a relationship.

## Transactional Rules

### Create Active Burial Link

1. Start a serializable transaction.
2. Load deceased and space; reject missing records.
3. Reject `RESERVED` or `INACTIVE` space.
4. Count active links and reject when count >= capacity.
5. Reject a second active link for the same deceased.
6. Create the active link.
7. Set space status to `OCCUPIED`.
8. Commit; retry a bounded number of times on serialization conflict.

### End Burial Link

1. Start a serializable transaction and load the active link.
2. Require confirmation data: `endedAt` and non-empty `endReason`.
3. Change link to `ENDED`; never delete it.
4. Count remaining active links for the space.
5. If remaining > 0, set `OCCUPIED`.
6. If remaining = 0 and status is not `RESERVED` or `INACTIVE`, set `AVAILABLE`.
7. Commit atomically.

### Change Space Status

- `AVAILABLE`: allowed only with zero active links.
- `OCCUPIED`: allowed only as the result of at least one active link.
- `RESERVED` or `INACTIVE`: allowed only with zero active links and blocks link creation.
- Every requested change requires confirmation and revalidation inside a transaction.

## DTO and Privacy Rules

### Search/List DTO

May include internal code, name, known dates, historical-incomplete flag, responsible name, structured
location, space type/status and `documentMasked`. It must not include full document, address, phone,
email, notes, password hash or session data.

`ResponsibleListItem` contains only ID, name and masked document when needed for differentiation.
`ResponsibleDetailResponse`, available only in authenticated administrative detail/edit flows, may
contain phone, email and address required for maintenance, while still masking the document.

### Exact Document Filter

The client submits a complete document or phone filter only in the body of a dedicated POST search
operation. The server trims and normalizes it and compares it exactly to the stored value. Sensitive
filters are never sent in query strings and never appear in list response bodies, URLs, logs, metrics
labels or error messages. Complete contact data remains restricted to authenticated administrative
detail and maintenance flows.

### Masking

- Keep only the final four alphanumeric characters visible.
- Replace every preceding alphanumeric character with `*` while preserving no semantic formatting
  requirement.
- Values shorter than or equal to four characters are fully masked because revealing them would
  expose the complete document.

## Migration Notes

The Tech Spec's initial schema is a baseline and must be amended before its first production
migration with `internalCode`, historical flags, `capacity`, link status, `endedAt`, `endReason`,
normalized search fields and ResponsibleLink lifecycle. Database check constraints not directly
expressible in Prisma schema must be added explicitly in the generated SQL migration and covered by
integration tests.
