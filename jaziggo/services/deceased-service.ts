import "server-only"

import { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import { generateUniqueInternalCode } from "../lib/deceased/internal-code"
import {
  toBurialLinkDto,
  type BurialLinkDto,
} from "../lib/dto/burial-link"
import {
  toDeceasedDetailDto,
  toDeceasedDuplicateCandidateDto,
  toDeceasedListItemDto,
} from "../lib/dto/deceased"
import { uuidSchema } from "../lib/validation/common"
import {
  createDeceasedSchema,
  type CreateDeceasedInput,
  deceasedExactDocumentSearchSchema,
  type DeceasedExactDocumentSearchInput,
  deceasedListFiltersSchema,
  type DeceasedListFiltersInput,
  type UpdateDeceasedInput,
  updateDeceasedSchema,
} from "../lib/validation/deceased"
import { normalizeSearchName } from "../lib/validation/normalize"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type PaginatedData,
} from "../types/api"
import { PERMISSION } from "../types/auth"
import type {
  DeceasedDetailDto,
  DeceasedDuplicateCandidateDto,
  DeceasedListItemDto,
} from "../types/deceased"
import { listBurialLinksByDeceased } from "./burial-link-service"

const MAX_DUPLICATE_CANDIDATES = 25

const DECEASED_LIST_DTO_SELECT = {
  id: true,
  internalCode: true,
  fullName: true,
  document: true,
  documentType: true,
  deathDate: true,
  burialDate: true,
  historicalDataIncomplete: true,
} as const satisfies Prisma.DeceasedSelect

const DECEASED_DUPLICATE_DTO_SELECT = {
  id: true,
  internalCode: true,
  fullName: true,
  document: true,
  documentType: true,
  birthDate: true,
  deathDate: true,
  burialDate: true,
  historicalDataIncomplete: true,
} as const satisfies Prisma.DeceasedSelect

const DECEASED_DETAIL_DTO_SELECT = {
  id: true,
  internalCode: true,
  fullName: true,
  document: true,
  documentType: true,
  birthDate: true,
  deathDate: true,
  burialDate: true,
  datesUnknown: true,
  historicalDataIncomplete: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.DeceasedSelect

type DeceasedServiceErrorCode =
  | typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR
  | typeof DOMAIN_ERROR_CODE.NOT_FOUND
  | typeof DOMAIN_ERROR_CODE.CONFLICT

type DeceasedServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.NOT_FOUND
  | typeof HTTP_STATUS.CONFLICT

export class DeceasedServiceError extends Error {
  readonly code: DeceasedServiceErrorCode
  readonly status: DeceasedServiceErrorStatus

  private constructor(
    code: DeceasedServiceErrorCode,
    status: DeceasedServiceErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = "DeceasedServiceError"
    this.code = code
    this.status = status
  }

  static validation(): DeceasedServiceError {
    return new DeceasedServiceError(
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "Invalid deceased data",
    )
  }

  static conflict(): DeceasedServiceError {
    return new DeceasedServiceError(
      DOMAIN_ERROR_CODE.CONFLICT,
      HTTP_STATUS.CONFLICT,
      "Deceased has links",
    )
  }

  static notFound(): DeceasedServiceError {
    return new DeceasedServiceError(
      DOMAIN_ERROR_CODE.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      "Deceased not found",
    )
  }
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
}

async function assertUniqueDeceasedDocument(
  documentType: "CPF" | "RG" | undefined,
  document: string | undefined,
  excludeDeceasedId?: string,
): Promise<void> {
  if (!documentType || !document) {
    return
  }

  const duplicate = await prisma.deceased.findFirst({
    where: {
      documentType,
      document,
      ...(excludeDeceasedId ? { id: { not: excludeDeceasedId } } : {}),
    },
    select: { id: true },
  })

  if (duplicate) {
    throw DeceasedServiceError.conflict()
  }
}

function shouldMarkDatesUnknown(input: {
  deathDate?: string
  burialDate?: string
  datesUnknown?: boolean
}): boolean {
  return input.datesUnknown === true || (!input.deathDate && !input.burialDate)
}

function calculateHistoricalDataIncomplete(
  document: string | undefined,
  deathDate: string | undefined,
  burialDate: string | undefined,
  datesUnknown: boolean | undefined,
): boolean {
  return (
    document === undefined ||
    datesUnknown === true ||
    (deathDate === undefined && burialDate === undefined)
  )
}

function toDateFilter(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function toOptionalDate(value: string | undefined): Date | undefined {
  return value === undefined ? undefined : toDateFilter(value)
}

function toNullableDate(value: string | undefined): Date | null {
  return value === undefined ? null : toDateFilter(value)
}

function buildDuplicateMatchFilters(input: {
  documentType?: "CPF" | "RG"
  document?: string
  birthDate?: string
  deathDate?: string
  burialDate?: string
}): Prisma.DeceasedWhereInput[] {
  const filters: Prisma.DeceasedWhereInput[] = []

  if (input.document !== undefined) {
    filters.push({ document: input.document, documentType: input.documentType })
  }

  if (input.birthDate !== undefined) {
    filters.push({ birthDate: toDateFilter(input.birthDate) })
  }

  if (input.deathDate !== undefined) {
    filters.push({ deathDate: toDateFilter(input.deathDate) })
  }

  if (input.burialDate !== undefined) {
    filters.push({ burialDate: toDateFilter(input.burialDate) })
  }

  return filters
}

export interface CheckDeceasedDuplicatesOptions {
  excludeDeceasedId?: string
}

export type DeceasedDetailWithBurialLinksDto = DeceasedDetailDto & {
  links: BurialLinkDto[]
}

export async function checkDeceasedDuplicates(
  input: CreateDeceasedInput,
  options: CheckDeceasedDuplicatesOptions = {},
): Promise<DeceasedDuplicateCandidateDto[]> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = createDeceasedSchema.safeParse(input)
  const parsedExcludedId =
    options.excludeDeceasedId === undefined
      ? undefined
      : uuidSchema.safeParse(options.excludeDeceasedId)

  if (
    !parsedInput.success ||
    (parsedExcludedId !== undefined && !parsedExcludedId.success)
  ) {
    throw DeceasedServiceError.validation()
  }

  const matchFilters = buildDuplicateMatchFilters(parsedInput.data)
  const candidates = await prisma.deceased.findMany({
    where: {
      searchName: normalizeSearchName(parsedInput.data.fullName),
      id:
        parsedExcludedId === undefined
          ? undefined
          : { not: parsedExcludedId.data },
      ...(matchFilters.length === 0 ? {} : { OR: matchFilters }),
    },
    select: DECEASED_DUPLICATE_DTO_SELECT,
    orderBy: [{ historicalDataIncomplete: "asc" }, { createdAt: "asc" }],
    take: MAX_DUPLICATE_CANDIDATES,
  })

  return candidates.map(toDeceasedDuplicateCandidateDto)
}

async function findDeceasedPage(
  where: Prisma.DeceasedWhereInput,
  page: number,
  pageSize: number,
): Promise<PaginatedData<DeceasedListItemDto>> {
  const skip = (page - 1) * pageSize

  if (!Number.isSafeInteger(skip)) {
    throw DeceasedServiceError.validation()
  }

  const [deceasedRecords, totalRecords] = await prisma.$transaction([
    prisma.deceased.findMany({
      where,
      select: DECEASED_LIST_DTO_SELECT,
      orderBy: [{ searchName: "asc" }, { internalCode: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.deceased.count({ where }),
  ])

  return {
    items: deceasedRecords.map(toDeceasedListItemDto),
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
    },
  }
}

export async function listDeceased(
  input: DeceasedListFiltersInput = {},
): Promise<PaginatedData<DeceasedListItemDto>> {
  await requirePermission(PERMISSION.SEARCH_RECORDS)

  const parsedInput = deceasedListFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw DeceasedServiceError.validation()
  }

  const {
    page,
    pageSize,
    name,
    internalCode,
    deathDate,
    burialDate,
    burialSpaceId,
  } = parsedInput.data
  const where: Prisma.DeceasedWhereInput = {
    searchName: name === undefined ? undefined : { contains: name },
    internalCode,
    deathDate: deathDate === undefined ? undefined : toDateFilter(deathDate),
    burialDate:
      burialDate === undefined ? undefined : toDateFilter(burialDate),
    burialLinks:
      burialSpaceId === undefined
        ? undefined
        : { some: { burialSpaceId } },
  }

  return findDeceasedPage(where, page, pageSize)
}

export async function searchDeceasedByDocument(
  input: DeceasedExactDocumentSearchInput,
): Promise<PaginatedData<DeceasedListItemDto>> {
  await requirePermission(PERMISSION.SEARCH_RECORDS)

  const parsedInput = deceasedExactDocumentSearchSchema.safeParse(input)

  if (!parsedInput.success) {
    throw DeceasedServiceError.validation()
  }

  const { document, documentType, page, pageSize } = parsedInput.data

  return findDeceasedPage({ document, documentType }, page, pageSize)
}

export async function getDeceasedById(
  deceasedId: string,
): Promise<DeceasedDetailWithBurialLinksDto> {
  await requirePermission(PERMISSION.SEARCH_RECORDS)

  const parsedId = uuidSchema.safeParse(deceasedId)

  if (!parsedId.success) {
    throw DeceasedServiceError.validation()
  }

  const deceased = await prisma.deceased.findUnique({
    where: { id: parsedId.data },
    select: DECEASED_DETAIL_DTO_SELECT,
  })

  if (!deceased) {
    throw DeceasedServiceError.notFound()
  }

  const burialLinks = await listBurialLinksByDeceased(parsedId.data)

  return {
    ...toDeceasedDetailDto(deceased),
    links: burialLinks.map(toBurialLinkDto),
  }
}

export async function createDeceased(
  input: CreateDeceasedInput,
): Promise<DeceasedDetailDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = createDeceasedSchema.safeParse(input)

  if (!parsedInput.success) {
    throw DeceasedServiceError.validation()
  }

  await assertUniqueDeceasedDocument(
    parsedInput.data.documentType,
    parsedInput.data.document,
  )

  const internalCode = await generateUniqueInternalCode(
    async (candidate) =>
      (await prisma.deceased.findUnique({
        where: { internalCode: candidate },
        select: { id: true },
      })) !== null,
  )
  const deceased = await prisma.deceased.create({
    data: {
      ...parsedInput.data,
      birthDate: toOptionalDate(parsedInput.data.birthDate),
      deathDate: toOptionalDate(parsedInput.data.deathDate),
      burialDate: toOptionalDate(parsedInput.data.burialDate),
      internalCode,
      searchName: normalizeSearchName(parsedInput.data.fullName),
      datesUnknown: shouldMarkDatesUnknown(parsedInput.data),
      historicalDataIncomplete: calculateHistoricalDataIncomplete(
        parsedInput.data.document,
        parsedInput.data.deathDate,
        parsedInput.data.burialDate,
        parsedInput.data.datesUnknown,
      ),
    },
    select: DECEASED_DETAIL_DTO_SELECT,
  })

  return toDeceasedDetailDto(deceased)
}

export async function updateDeceased(
  deceasedId: string,
  input: UpdateDeceasedInput,
): Promise<DeceasedDetailDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedId = uuidSchema.safeParse(deceasedId)
  const parsedInput = updateDeceasedSchema.safeParse(input)

  if (!parsedId.success || !parsedInput.success) {
    throw DeceasedServiceError.validation()
  }

  const currentDeceased = await prisma.deceased.findUnique({
    where: { id: parsedId.data },
    select: { document: true },
  })

  if (!currentDeceased) {
    throw DeceasedServiceError.notFound()
  }

  await assertUniqueDeceasedDocument(
    parsedInput.data.documentType,
    parsedInput.data.document,
    parsedId.data,
  )

  const nextDocument = parsedInput.data.document ?? currentDeceased.document ?? undefined

  try {
    const deceased = await prisma.deceased.update({
      where: { id: parsedId.data },
      data: {
        fullName: parsedInput.data.fullName,
        searchName: normalizeSearchName(parsedInput.data.fullName),
        ...(parsedInput.data.document
          ? {
              document: parsedInput.data.document,
              documentType: parsedInput.data.documentType,
            }
          : {}),
        birthDate: toNullableDate(parsedInput.data.birthDate),
        deathDate: toNullableDate(parsedInput.data.deathDate),
        burialDate: toNullableDate(parsedInput.data.burialDate),
        datesUnknown: shouldMarkDatesUnknown(parsedInput.data),
        historicalDataIncomplete: calculateHistoricalDataIncomplete(
          nextDocument,
          parsedInput.data.deathDate,
          parsedInput.data.burialDate,
          parsedInput.data.datesUnknown,
        ),
        notes: parsedInput.data.notes ?? null,
      },
      select: DECEASED_DETAIL_DTO_SELECT,
    })

    return toDeceasedDetailDto(deceased)
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw DeceasedServiceError.notFound()
    }

    throw error
  }
}

function validateConfirmationText(confirmationText: string | undefined): void {
  if (confirmationText?.trim().toLowerCase() !== "confirmo") {
    throw DeceasedServiceError.validation()
  }
}

export async function countDeceasedLinks(deceasedId: string): Promise<number> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedId = uuidSchema.safeParse(deceasedId)

  if (!parsedId.success) {
    throw DeceasedServiceError.validation()
  }

  const [burialLinks, responsibleLinks] = await prisma.$transaction([
    prisma.burialLink.count({ where: { deceasedId: parsedId.data } }),
    prisma.responsibleLink.count({ where: { deceasedId: parsedId.data } }),
  ])

  return burialLinks + responsibleLinks
}

export async function unlinkDeceased(
  deceasedId: string,
  confirmationText: string | undefined,
): Promise<void> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)
  validateConfirmationText(confirmationText)

  const parsedId = uuidSchema.safeParse(deceasedId)

  if (!parsedId.success) {
    throw DeceasedServiceError.validation()
  }

  await prisma.$transaction([
    prisma.responsibleLink.deleteMany({ where: { deceasedId: parsedId.data } }),
    prisma.burialLink.deleteMany({ where: { deceasedId: parsedId.data } }),
  ])
}

export async function deleteDeceased(
  deceasedId: string,
  confirmationText: string | undefined,
): Promise<void> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)
  validateConfirmationText(confirmationText)

  const parsedId = uuidSchema.safeParse(deceasedId)

  if (!parsedId.success) {
    throw DeceasedServiceError.validation()
  }

  if ((await countDeceasedLinks(parsedId.data)) > 0) {
    throw DeceasedServiceError.conflict()
  }

  try {
    await prisma.deceased.delete({ where: { id: parsedId.data } })
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw DeceasedServiceError.notFound()
    }

    throw error
  }
}