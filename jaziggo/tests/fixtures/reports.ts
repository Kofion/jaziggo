import {
  BURIAL_LINK_STATUS,
  type BurialLinkStatus,
} from "../../types/burial-link"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceStatus,
  type BurialSpaceType,
} from "../../types/burial-space"
import type {
  BurialsByPeriodReportFiltersInput,
  DeceasedReportFiltersInput,
  SpaceReportFiltersInput,
} from "../../lib/validation/report"

interface ReportDeceasedFixture {
  id: string
  internalCode: string
  fullName: string
  searchName: string
  deathDate: string
  burialDate: string
  datesUnknown: false
  historicalDataIncomplete: true
  createdAt: string
}

interface ReportBurialSpaceFixture {
  id: string
  type: BurialSpaceType
  identifier: string
  locationKey: string
  sector: string
  row: string
  number: string
  status: BurialSpaceStatus
  capacity: number
}

interface ReportBurialLinkFixture {
  id: string
  deceasedId: string
  burialSpaceId: string
  burialDate: string
  status: BurialLinkStatus
  endedAt?: string
  endReason?: string
  createdAt: string
}

export const januaryFirstDeceasedReportFixture = {
  id: "00000000-0000-4000-8000-000000008001",
  internalCode: "DEC-REPORT-0001",
  fullName: "January First Report Fixture",
  searchName: "january first report fixture",
  deathDate: "2025-01-03",
  burialDate: "2025-01-05",
  datesUnknown: false,
  historicalDataIncomplete: true,
  createdAt: "2025-01-04T10:00:00.000Z",
} as const satisfies ReportDeceasedFixture

export const januaryLastDeceasedReportFixture = {
  id: "00000000-0000-4000-8000-000000008002",
  internalCode: "DEC-REPORT-0002",
  fullName: "January Last Report Fixture",
  searchName: "january last report fixture",
  deathDate: "2025-01-29",
  burialDate: "2025-01-31",
  datesUnknown: false,
  historicalDataIncomplete: true,
  createdAt: "2025-01-31T23:59:59.000Z",
} as const satisfies ReportDeceasedFixture

export const februaryDeceasedReportFixture = {
  id: "00000000-0000-4000-8000-000000008003",
  internalCode: "DEC-REPORT-0003",
  fullName: "February Report Fixture",
  searchName: "february report fixture",
  deathDate: "2025-02-08",
  burialDate: "2025-02-10",
  datesUnknown: false,
  historicalDataIncomplete: true,
  createdAt: "2025-02-09T10:00:00.000Z",
} as const satisfies ReportDeceasedFixture

export const reportDeceasedFixtures = [
  januaryFirstDeceasedReportFixture,
  januaryLastDeceasedReportFixture,
  februaryDeceasedReportFixture,
] as const satisfies readonly ReportDeceasedFixture[]

export const availableSepulturaReportFixture = {
  id: "00000000-0000-4000-8000-000000009001",
  type: BURIAL_SPACE_TYPE.SEPULTURA,
  identifier: "SEP-REPORT-AVAILABLE",
  locationKey: "sector=report%20sector%20a|row=a1|number=1",
  sector: "report sector a",
  row: "A1",
  number: "1",
  status: BURIAL_SPACE_STATUS.AVAILABLE,
  capacity: 1,
} as const satisfies ReportBurialSpaceFixture

export const occupiedSepulturaReportFixture = {
  id: "00000000-0000-4000-8000-000000009002",
  type: BURIAL_SPACE_TYPE.SEPULTURA,
  identifier: "SEP-REPORT-OCCUPIED",
  locationKey: "sector=report%20sector%20a|row=a2|number=2",
  sector: "report sector a",
  row: "A2",
  number: "2",
  status: BURIAL_SPACE_STATUS.OCCUPIED,
  capacity: 1,
} as const satisfies ReportBurialSpaceFixture

export const reservedJazigoReportFixture = {
  id: "00000000-0000-4000-8000-000000009003",
  type: BURIAL_SPACE_TYPE.JAZIGO,
  identifier: "JAZ-REPORT-RESERVED",
  locationKey: "sector=report%20sector%20b|row=b1|number=1",
  sector: "report sector b",
  row: "B1",
  number: "1",
  status: BURIAL_SPACE_STATUS.RESERVED,
  capacity: 3,
} as const satisfies ReportBurialSpaceFixture

export const inactiveJazigoReportFixture = {
  id: "00000000-0000-4000-8000-000000009004",
  type: BURIAL_SPACE_TYPE.JAZIGO,
  identifier: "JAZ-REPORT-INACTIVE",
  locationKey: "sector=report%20sector%20b|row=b2|number=2",
  sector: "report sector b",
  row: "B2",
  number: "2",
  status: BURIAL_SPACE_STATUS.INACTIVE,
  capacity: 2,
} as const satisfies ReportBurialSpaceFixture

export const reportBurialSpaceFixtures = [
  availableSepulturaReportFixture,
  occupiedSepulturaReportFixture,
  reservedJazigoReportFixture,
  inactiveJazigoReportFixture,
] as const satisfies readonly ReportBurialSpaceFixture[]

export const endedJanuaryBurialReportFixture = {
  id: "00000000-0000-4000-8000-000000010001",
  deceasedId: januaryFirstDeceasedReportFixture.id,
  burialSpaceId: availableSepulturaReportFixture.id,
  burialDate: januaryFirstDeceasedReportFixture.burialDate,
  status: BURIAL_LINK_STATUS.ENDED,
  endedAt: "2025-01-20T12:00:00.000Z",
  endReason: "Synthetic historical closure",
  createdAt: "2025-01-05T12:00:00.000Z",
} as const satisfies ReportBurialLinkFixture

export const activeJanuaryBurialReportFixture = {
  id: "00000000-0000-4000-8000-000000010002",
  deceasedId: januaryLastDeceasedReportFixture.id,
  burialSpaceId: occupiedSepulturaReportFixture.id,
  burialDate: januaryLastDeceasedReportFixture.burialDate,
  status: BURIAL_LINK_STATUS.ACTIVE,
  createdAt: "2025-01-31T12:00:00.000Z",
} as const satisfies ReportBurialLinkFixture

export const endedFebruaryBurialReportFixture = {
  id: "00000000-0000-4000-8000-000000010003",
  deceasedId: februaryDeceasedReportFixture.id,
  burialSpaceId: availableSepulturaReportFixture.id,
  burialDate: februaryDeceasedReportFixture.burialDate,
  status: BURIAL_LINK_STATUS.ENDED,
  endedAt: "2025-03-01T12:00:00.000Z",
  endReason: "Synthetic out-of-period closure",
  createdAt: "2025-02-10T12:00:00.000Z",
} as const satisfies ReportBurialLinkFixture

export const reportBurialLinkFixtures = [
  endedJanuaryBurialReportFixture,
  activeJanuaryBurialReportFixture,
  endedFebruaryBurialReportFixture,
] as const satisfies readonly ReportBurialLinkFixture[]

export const januaryDeceasedReportScenario = {
  filters: {
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    page: 1,
    pageSize: 25,
  } satisfies DeceasedReportFiltersInput,
  expectedTotalRecords: 2,
} as const

export const januaryBurialsReportScenario = {
  filters: {
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    page: 1,
    pageSize: 25,
  } satisfies BurialsByPeriodReportFiltersInput,
  expectedTotalRecords: 2,
  expectedActiveRecords: 1,
  expectedEndedRecords: 1,
} as const

export const allSpaceStatusesReportScenario = {
  filters: {
    page: 1,
    pageSize: 25,
  } satisfies SpaceReportFiltersInput,
  expectedTotalRecords: 4,
  expectedStatusTotals: {
    [BURIAL_SPACE_STATUS.AVAILABLE]: 1,
    [BURIAL_SPACE_STATUS.OCCUPIED]: 1,
    [BURIAL_SPACE_STATUS.RESERVED]: 1,
    [BURIAL_SPACE_STATUS.INACTIVE]: 1,
  },
  expectedActiveLinkCount: 1,
  expectedAvailableCapacity: 6,
} as const

export const sectorAReportScenario = {
  filters: {
    sector: "Report Sector A",
    page: 1,
    pageSize: 25,
  } satisfies SpaceReportFiltersInput,
  expectedTotalRecords: 2,
} as const

export const emptyReportScenarios = {
  deceased: {
    startDate: "2099-01-01",
    endDate: "2099-01-31",
    page: 1,
    pageSize: 25,
  } satisfies DeceasedReportFiltersInput,
  burialsByPeriod: {
    startDate: "2099-01-01",
    endDate: "2099-01-31",
    page: 1,
    pageSize: 25,
  } satisfies BurialsByPeriodReportFiltersInput,
  spaces: {
    sector: "Report Sector Without Results",
    page: 1,
    pageSize: 25,
  } satisfies SpaceReportFiltersInput,
  expectedTotalRecords: 0,
} as const
