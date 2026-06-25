import "server-only"

import type { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import {
  toBurialByPeriodReportItemDto,
  toDeceasedReportItemDto,
  toPaginatedReportDto,
} from "../lib/dto/report"
import {
  burialsByPeriodReportFiltersSchema,
  deceasedReportFiltersSchema,
  type BurialsByPeriodReportFiltersInput,
  type DeceasedReportFiltersInput,
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
} from "../types/report"

const DECEASED_REPORT_TITLE = "Falecidos cadastrados"
const DECEASED_REPORT_EMPTY_MESSAGE =
  "Nenhum falecido encontrado para os filtros selecionados."
const BURIALS_BY_PERIOD_REPORT_TITLE = "Sepultamentos por período"
const BURIALS_BY_PERIOD_REPORT_EMPTY_MESSAGE =
  "Nenhum sepultamento encontrado para os filtros selecionados."

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

export async function generateDeceasedReport(
  input: DeceasedReportFiltersInput = {},
): Promise<DeceasedReportDto> {
  await requirePermission(PERMISSION.VIEW_REPORTS)

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

export async function generateBurialsByPeriodReport(
  input: BurialsByPeriodReportFiltersInput = {},
): Promise<BurialsByPeriodReportDto> {
  await requirePermission(PERMISSION.VIEW_REPORTS)

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
