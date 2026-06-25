import "server-only"

import type { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import {
  toBurialByPeriodReportItemDto,
  toDeceasedReportItemDto,
  toPaginatedReportDto,
  toSpaceOccupationReportItemDto,
  toSpaceStatusReportItemDto,
} from "../lib/dto/report"
import {
  REPORT_RESULT,
  REPORT_TYPE,
  recordReportObservation,
  type ReportType,
} from "../lib/observability/metrics"
import {
  burialsByPeriodReportFiltersSchema,
  deceasedReportFiltersSchema,
  spaceOccupationReportFiltersSchema,
  spaceStatusReportFiltersSchema,
  type BurialsByPeriodReportFiltersInput,
  type DeceasedReportFiltersInput,
  type SpaceReportFiltersInput,
} from "../lib/validation/report"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type PaginationMeta,
} from "../types/api"
import { PERMISSION } from "../types/auth"
import type {
  BurialsByPeriodReportDto,
  BurialsByPeriodReportFilters,
  DeceasedReportDto,
  DeceasedReportFilters,
  SpaceOccupationReportDto,
  SpaceReportFilters,
  SpaceStatusReportDto,
} from "../types/report"

const DECEASED_REPORT_TITLE = "Falecidos cadastrados"
const DECEASED_REPORT_EMPTY_MESSAGE =
  "Nenhum falecido encontrado para os filtros selecionados."
const BURIALS_BY_PERIOD_REPORT_TITLE = "Sepultamentos por período"
const BURIALS_BY_PERIOD_REPORT_EMPTY_MESSAGE =
  "Nenhum sepultamento encontrado para os filtros selecionados."
const SPACE_OCCUPATION_REPORT_TITLE = "Ocupação dos espaços"
const SPACE_OCCUPATION_REPORT_EMPTY_MESSAGE =
  "Nenhum espaço encontrado para os filtros selecionados."
const SPACE_STATUS_REPORT_TITLE = "Espaços por status"
const SPACE_STATUS_REPORT_EMPTY_MESSAGE =
  "Nenhum espaço encontrado para os filtros selecionados."

const DECEASED_REPORT_SELECT = {
  id: true,
  internalCode: true,
  fullName: true,
  document: true,
  deathDate: true,
  burialDate: true,
  historicalDataIncomplete: true,
  createdAt: true,
} as const satisfies Prisma.DeceasedSelect

const BURIALS_BY_PERIOD_REPORT_SELECT = {
  id: true,
  burialDate: true,
  status: true,
  deceased: {
    select: {
      id: true,
      internalCode: true,
      fullName: true,
      document: true,
    },
  },
  burialSpace: {
    select: {
      id: true,
      type: true,
      identifier: true,
      sector: true,
      block: true,
      street: true,
      row: true,
      number: true,
      complement: true,
      status: true,
    },
  },
} as const satisfies Prisma.BurialLinkSelect

const SPACE_REPORT_SELECT = {
  id: true,
  type: true,
  identifier: true,
  sector: true,
  block: true,
  street: true,
  row: true,
  number: true,
  complement: true,
  status: true,
  capacity: true,
  _count: {
    select: {
      burialLinks: {
        where: { status: "ACTIVE" },
      },
    },
  },
} as const satisfies Prisma.BurialSpaceSelect

type ReportServiceErrorCode =
  typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR

type ReportServiceErrorStatus =
  typeof HTTP_STATUS.UNPROCESSABLE_ENTITY

export class ReportServiceError extends Error {
  readonly code: ReportServiceErrorCode
  readonly status: ReportServiceErrorStatus

  private constructor(
    code: ReportServiceErrorCode,
    status: ReportServiceErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = "ReportServiceError"
    this.code = code
    this.status = status
  }

  static validation(): ReportServiceError {
    return new ReportServiceError(
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "Invalid report filters",
    )
  }
}

function toStartDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function toExclusiveEndDate(value: string): Date {
  const endDate = toStartDate(value)
  endDate.setUTCDate(endDate.getUTCDate() + 1)

  return endDate
}

function buildDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
): Prisma.DateTimeFilter | undefined {
  if (startDate === undefined && endDate === undefined) {
    return undefined
  }

  return {
    ...(startDate === undefined
      ? {}
      : { gte: toStartDate(startDate) }),
    ...(endDate === undefined
      ? {}
      : { lt: toExclusiveEndDate(endDate) }),
  }
}

function calculatePagination(
  page: number,
  pageSize: number,
  totalRecords: number,
): PaginationMeta {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: Math.ceil(totalRecords / pageSize),
  }
}

function calculateSkip(page: number, pageSize: number): number {
  const skip = (page - 1) * pageSize

  if (!Number.isSafeInteger(skip)) {
    throw ReportServiceError.validation()
  }

  return skip
}

function buildSpaceReportFilters(
  input: {
    status?: SpaceReportFilters["status"]
    type?: SpaceReportFilters["type"]
    sector?: string
    linkStatus?: SpaceReportFilters["linkStatus"]
  },
): SpaceReportFilters {
  return {
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.type === undefined ? {} : { type: input.type }),
    ...(input.sector === undefined ? {} : { sector: input.sector }),
    ...(input.linkStatus === undefined
      ? {}
      : { linkStatus: input.linkStatus }),
  }
}

function buildSpaceWhere(
  filters: SpaceReportFilters,
): Prisma.BurialSpaceWhereInput {
  return {
    status: filters.status,
    type: filters.type,
    sector: filters.sector,
    burialLinks:
      filters.linkStatus === undefined
        ? undefined
        : { some: { status: filters.linkStatus } },
  }
}

function toSpaceReportSource(
  space: Prisma.BurialSpaceGetPayload<{
    select: typeof SPACE_REPORT_SELECT
  }>,
) {
  return {
    id: space.id,
    type: space.type,
    identifier: space.identifier,
    status: space.status,
    capacity: space.capacity,
    activeLinkCount: space._count.burialLinks,
    sector: space.sector ?? undefined,
    block: space.block ?? undefined,
    street: space.street ?? undefined,
    row: space.row ?? undefined,
    number: space.number ?? undefined,
    complement: space.complement ?? undefined,
  }
}

async function observeReport<T extends { data: readonly unknown[] }>(
  type: ReportType,
  execute: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now()
  let userId: string | undefined

  try {
    const user = await requirePermission(PERMISSION.VIEW_REPORTS)
    userId = user.id

    const report = await execute()
    const result =
      report.data.length === 0
        ? REPORT_RESULT.EMPTY
        : REPORT_RESULT.FOUND

    recordReportObservation({
      type,
      result,
      durationMs: performance.now() - startedAt,
      userId,
      resultCount: report.data.length,
    })

    return report
  } catch (error) {
    recordReportObservation({
      type,
      result: REPORT_RESULT.ERROR,
      durationMs: performance.now() - startedAt,
      userId,
    })

    throw error
  }
}

async function buildDeceasedReport(
  input: DeceasedReportFiltersInput = {},
): Promise<DeceasedReportDto> {
  const parsedInput = deceasedReportFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw ReportServiceError.validation()
  }

  const { page, pageSize, startDate, endDate } = parsedInput.data
  const filters: DeceasedReportFilters = {
    ...(startDate === undefined ? {} : { startDate }),
    ...(endDate === undefined ? {} : { endDate }),
  }
  const where: Prisma.DeceasedWhereInput = {
    createdAt: buildDateRange(startDate, endDate),
  }
  const skip = calculateSkip(page, pageSize)
  const [records, totalRecords] = await prisma.$transaction([
    prisma.deceased.findMany({
      where,
      select: DECEASED_REPORT_SELECT,
      orderBy: [{ createdAt: "desc" }, { internalCode: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.deceased.count({ where }),
  ])
  const items = records.map(toDeceasedReportItemDto)

  return toPaginatedReportDto({
    title: DECEASED_REPORT_TITLE,
    generatedAt: new Date(),
    filters,
    items,
    pagination: calculatePagination(page, pageSize, totalRecords),
    emptyMessage: DECEASED_REPORT_EMPTY_MESSAGE,
  })
}

async function buildBurialsByPeriodReport(
  input: BurialsByPeriodReportFiltersInput = {},
): Promise<BurialsByPeriodReportDto> {
  const parsedInput =
    burialsByPeriodReportFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw ReportServiceError.validation()
  }

  const {
    page,
    pageSize,
    startDate,
    endDate,
    linkStatus,
  } = parsedInput.data
  const filters: BurialsByPeriodReportFilters = {
    ...(startDate === undefined ? {} : { startDate }),
    ...(endDate === undefined ? {} : { endDate }),
    ...(linkStatus === undefined ? {} : { linkStatus }),
  }
  const where: Prisma.BurialLinkWhereInput = {
    burialDate: buildDateRange(startDate, endDate),
    status: linkStatus,
  }
  const skip = calculateSkip(page, pageSize)
  const [records, totalRecords] = await prisma.$transaction([
    prisma.burialLink.findMany({
      where,
      select: BURIALS_BY_PERIOD_REPORT_SELECT,
      orderBy: [
        { burialDate: "desc" },
        { deceased: { searchName: "asc" } },
        { id: "asc" },
      ],
      skip,
      take: pageSize,
    }),
    prisma.burialLink.count({ where }),
  ])
  const items = records.map((record) =>
    toBurialByPeriodReportItemDto({
      ...record,
      burialSpace: {
        ...record.burialSpace,
        sector: record.burialSpace.sector ?? undefined,
        block: record.burialSpace.block ?? undefined,
        street: record.burialSpace.street ?? undefined,
        row: record.burialSpace.row ?? undefined,
        number: record.burialSpace.number ?? undefined,
        complement: record.burialSpace.complement ?? undefined,
      },
    }),
  )

  return toPaginatedReportDto({
    title: BURIALS_BY_PERIOD_REPORT_TITLE,
    generatedAt: new Date(),
    filters,
    items,
    pagination: calculatePagination(page, pageSize, totalRecords),
    emptyMessage: BURIALS_BY_PERIOD_REPORT_EMPTY_MESSAGE,
  })
}

async function buildSpaceOccupationReport(
  input: SpaceReportFiltersInput = {},
): Promise<SpaceOccupationReportDto> {
  const parsedInput =
    spaceOccupationReportFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw ReportServiceError.validation()
  }

  const { page, pageSize, status, type, sector, linkStatus } =
    parsedInput.data
  const filters = buildSpaceReportFilters({
    status,
    type,
    sector,
    linkStatus,
  })
  const where = buildSpaceWhere(filters)
  const skip = calculateSkip(page, pageSize)
  const [spaces, totalRecords] = await prisma.$transaction([
    prisma.burialSpace.findMany({
      where,
      select: SPACE_REPORT_SELECT,
      orderBy: [
        { type: "asc" },
        { identifier: "asc" },
        { locationKey: "asc" },
        { id: "asc" },
      ],
      skip,
      take: pageSize,
    }),
    prisma.burialSpace.count({ where }),
  ])
  const items = spaces.map((space) =>
    toSpaceOccupationReportItemDto(toSpaceReportSource(space)),
  )

  return toPaginatedReportDto({
    title: SPACE_OCCUPATION_REPORT_TITLE,
    generatedAt: new Date(),
    filters,
    items,
    pagination: calculatePagination(page, pageSize, totalRecords),
    emptyMessage: SPACE_OCCUPATION_REPORT_EMPTY_MESSAGE,
  })
}

async function buildSpaceStatusReport(
  input: SpaceReportFiltersInput = {},
): Promise<SpaceStatusReportDto> {
  const parsedInput = spaceStatusReportFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw ReportServiceError.validation()
  }

  const { page, pageSize, status, type, sector, linkStatus } =
    parsedInput.data
  const filters = buildSpaceReportFilters({
    status,
    type,
    sector,
    linkStatus,
  })
  const where = buildSpaceWhere(filters)
  const skip = calculateSkip(page, pageSize)
  const [spaces, totalRecords] = await prisma.$transaction([
    prisma.burialSpace.findMany({
      where,
      select: SPACE_REPORT_SELECT,
      orderBy: [
        { status: "asc" },
        { type: "asc" },
        { identifier: "asc" },
        { locationKey: "asc" },
        { id: "asc" },
      ],
      skip,
      take: pageSize,
    }),
    prisma.burialSpace.count({ where }),
  ])
  const items = spaces.map((space) =>
    toSpaceStatusReportItemDto(toSpaceReportSource(space)),
  )

  return toPaginatedReportDto({
    title: SPACE_STATUS_REPORT_TITLE,
    generatedAt: new Date(),
    filters,
    items,
    pagination: calculatePagination(page, pageSize, totalRecords),
    emptyMessage: SPACE_STATUS_REPORT_EMPTY_MESSAGE,
  })
}

export function generateDeceasedReport(
  input: DeceasedReportFiltersInput = {},
): Promise<DeceasedReportDto> {
  return observeReport(REPORT_TYPE.DECEASED, () =>
    buildDeceasedReport(input),
  )
}

export function generateBurialsByPeriodReport(
  input: BurialsByPeriodReportFiltersInput = {},
): Promise<BurialsByPeriodReportDto> {
  return observeReport(REPORT_TYPE.BURIALS_BY_PERIOD, () =>
    buildBurialsByPeriodReport(input),
  )
}

export function generateSpaceOccupationReport(
  input: SpaceReportFiltersInput = {},
): Promise<SpaceOccupationReportDto> {
  return observeReport(REPORT_TYPE.SPACE_OCCUPATION, () =>
    buildSpaceOccupationReport(input),
  )
}

export function generateSpaceStatusReport(
  input: SpaceReportFiltersInput = {},
): Promise<SpaceStatusReportDto> {
  return observeReport(REPORT_TYPE.SPACE_STATUS, () =>
    buildSpaceStatusReport(input),
  )
}
