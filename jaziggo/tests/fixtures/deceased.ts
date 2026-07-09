import type {
  CreateDeceasedInput,
  DeceasedDuplicateCandidateDto,
} from "../../types/deceased"

type DeceasedPersistenceFixture = CreateDeceasedInput & {
  id: string
  internalCode: string
  searchName: string
  datesUnknown: boolean
  historicalDataIncomplete: boolean
}

export interface InvalidDeceasedInputFixture {
  input: Record<string, unknown>
  invalidField: string
}

export const completeDeceasedFixture = {
  id: "00000000-0000-4000-8000-000000006001",
  internalCode: "DEC-FIXTURE-0001",
  fullName: "Complete Deceased Fixture",
  searchName: "complete deceased fixture",
  document: "90000000001",
  birthDate: "1940-01-15",
  deathDate: "2025-02-10",
  burialDate: "2025-02-12",
  datesUnknown: false,
  historicalDataIncomplete: false,
  notes: "Synthetic complete record for automated tests",
} as const satisfies DeceasedPersistenceFixture

export const deathDateOnlyDeceasedFixture = {
  id: "00000000-0000-4000-8000-000000006002",
  internalCode: "DEC-FIXTURE-0002",
  fullName: "Death Date Only Fixture",
  searchName: "death date only fixture",
  document: "90000000002",
  deathDate: "2024-03-20",
  datesUnknown: false,
  historicalDataIncomplete: false,
} as const satisfies DeceasedPersistenceFixture

export const burialDateOnlyDeceasedFixture = {
  id: "00000000-0000-4000-8000-000000006003",
  internalCode: "DEC-FIXTURE-0003",
  fullName: "Burial Date Only Fixture",
  searchName: "burial date only fixture",
  burialDate: "2023-04-18",
  datesUnknown: false,
  historicalDataIncomplete: true,
} as const satisfies DeceasedPersistenceFixture

export const historicalDeceasedFixture = {
  id: "00000000-0000-4000-8000-000000006004",
  internalCode: "DEC-FIXTURE-0004",
  fullName: "Historical Deceased Fixture",
  searchName: "historical deceased fixture",
  datesUnknown: true,
  historicalDataIncomplete: true,
  notes: "Synthetic historical record with unknown dates",
} as const satisfies DeceasedPersistenceFixture

export const homonymDeceasedFixture = {
  id: "00000000-0000-4000-8000-000000006005",
  internalCode: "DEC-FIXTURE-0005",
  fullName: "Alex Deceased Fixture",
  searchName: "alex deceased fixture",
  document: "90000000005",
  birthDate: "1935-05-01",
  deathDate: "2020-06-10",
  burialDate: "2020-06-12",
  datesUnknown: false,
  historicalDataIncomplete: false,
} as const satisfies DeceasedPersistenceFixture

export const homonymDeceasedWithDifferentDatesFixture = {
  id: "00000000-0000-4000-8000-000000006006",
  internalCode: "DEC-FIXTURE-0006",
  fullName: "Alex Deceased Fixture",
  searchName: "alex deceased fixture",
  document: "90000000006",
  birthDate: "1945-07-15",
  deathDate: "2021-08-20",
  burialDate: "2021-08-22",
  datesUnknown: false,
  historicalDataIncomplete: false,
} as const satisfies DeceasedPersistenceFixture

export const sameNameAndDeathDateDuplicateFixture = {
  id: "00000000-0000-4000-8000-000000006007",
  internalCode: "DEC-FIXTURE-0007",
  fullName: homonymDeceasedFixture.fullName,
  searchName: homonymDeceasedFixture.searchName,
  document: "90000000007",
  birthDate: "1936-09-10",
  deathDate: homonymDeceasedFixture.deathDate,
  burialDate: "2020-06-13",
  datesUnknown: false,
  historicalDataIncomplete: false,
} as const satisfies DeceasedPersistenceFixture

export const equalDateBoundariesDeceasedFixture = {
  id: "00000000-0000-4000-8000-000000006008",
  internalCode: "DEC-FIXTURE-0008",
  fullName: "Equal Date Boundaries Fixture",
  searchName: "equal date boundaries fixture",
  document: "90000000008",
  birthDate: "2022-10-05",
  deathDate: "2022-10-05",
  burialDate: "2022-10-05",
  datesUnknown: false,
  historicalDataIncomplete: false,
} as const satisfies DeceasedPersistenceFixture

export const homonymDeceasedDuplicateCandidateFixture = {
  id: homonymDeceasedFixture.id,
  internalCode: homonymDeceasedFixture.internalCode,
  fullName: homonymDeceasedFixture.fullName,
  documentMasked: "*******0005",
  birthDate: homonymDeceasedFixture.birthDate,
  deathDate: homonymDeceasedFixture.deathDate,
  burialDate: homonymDeceasedFixture.burialDate,
  historicalDataIncomplete: false,
} as const satisfies DeceasedDuplicateCandidateDto

export const homonymDeceasedWithDifferentDatesCandidateFixture = {
  id: homonymDeceasedWithDifferentDatesFixture.id,
  internalCode: homonymDeceasedWithDifferentDatesFixture.internalCode,
  fullName: homonymDeceasedWithDifferentDatesFixture.fullName,
  documentMasked: "*******0006",
  birthDate: homonymDeceasedWithDifferentDatesFixture.birthDate,
  deathDate: homonymDeceasedWithDifferentDatesFixture.deathDate,
  burialDate: homonymDeceasedWithDifferentDatesFixture.burialDate,
  historicalDataIncomplete: false,
} as const satisfies DeceasedDuplicateCandidateDto


export const unknownDatesWithKnownDateInputFixture = {
  input: {
    fullName: "Unknown And Known Dates Fixture",
    deathDate: "2024-01-10",
    datesUnknown: true,
  },
  invalidField: "datesUnknown",
} as const satisfies InvalidDeceasedInputFixture

export const birthAfterDeathInputFixture = {
  input: {
    fullName: "Birth After Death Fixture",
    birthDate: "2024-01-11",
    deathDate: "2024-01-10",
  },
  invalidField: "birthDate",
} as const satisfies InvalidDeceasedInputFixture

export const birthAfterBurialInputFixture = {
  input: {
    fullName: "Birth After Burial Fixture",
    birthDate: "2024-01-11",
    burialDate: "2024-01-10",
  },
  invalidField: "birthDate",
} as const satisfies InvalidDeceasedInputFixture

export const burialBeforeDeathInputFixture = {
  input: {
    fullName: "Burial Before Death Fixture",
    deathDate: "2024-01-11",
    burialDate: "2024-01-10",
  },
  invalidField: "burialDate",
} as const satisfies InvalidDeceasedInputFixture

export const deceasedFixtures = [
  completeDeceasedFixture,
  deathDateOnlyDeceasedFixture,
  burialDateOnlyDeceasedFixture,
  historicalDeceasedFixture,
  homonymDeceasedFixture,
  homonymDeceasedWithDifferentDatesFixture,
  sameNameAndDeathDateDuplicateFixture,
  equalDateBoundariesDeceasedFixture,
] as const

export const deceasedDuplicateCandidateFixtures = [
  homonymDeceasedDuplicateCandidateFixture,
  homonymDeceasedWithDifferentDatesCandidateFixture,
] as const

export const invalidDeceasedInputFixtures = [
  unknownDatesWithKnownDateInputFixture,
  birthAfterDeathInputFixture,
  birthAfterBurialInputFixture,
  burialBeforeDeathInputFixture,
] as const