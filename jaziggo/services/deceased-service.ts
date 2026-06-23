import "server-only"

import { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import { generateUniqueInternalCode } from "../lib/deceased/internal-code"
import {
  toDeceasedDetailDto,
  toDeceasedDuplicateCandidateDto,
} from "../lib/dto/deceased"
import { uuidSchema } from "../lib/validation/common"
import {
  createDeceasedSchema,
  type CreateDeceasedInput,
  type UpdateDeceasedInput,
  updateDeceasedSchema,
} from "../lib/validation/deceased"
import { normalizeSearchName } from "../lib/validation/normalize"
import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "../types/api"
import { PERMISSION } from "../types/auth"
import type {
  DeceasedDetailDto,
  DeceasedDuplicateCandidateDto,
} from "../types/deceased"

const MAX_DUPLICATE_CANDIDATES = 25

const DECEASED_DUPLICATE_DTO_SELECT = {
  id: true,
  internalCode: true,
  fullName: true,
  document: true,
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

type DeceasedServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.NOT_FOUND

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

function calculateHistoricalDataIncomplete(
  document: string | undefined,
  datesUnknown: boolean | undefined,
): boolean {
  return document === undefined || datesUnknown === true
}

function toDateFilter(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function buildDuplicateMatchFilters(input: {
  document?: string
  birthDate?: string
  deathDate?: string
  burialDate?: string
}): Prisma.DeceasedWhereInput[] {
  const filters: Prisma.DeceasedWhereInput[] = []

  if (input.document !== undefined) {
    filters.push({ document: input.document })
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

export async function createDeceased(
  input: CreateDeceasedInput,
): Promise<DeceasedDetailDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = createDeceasedSchema.safeParse(input)

  if (!parsedInput.success) {
    throw DeceasedServiceError.validation()
  }

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
      internalCode,
      searchName: normalizeSearchName(parsedInput.data.fullName),
      datesUnknown: parsedInput.data.datesUnknown === true,
      historicalDataIncomplete: calculateHistoricalDataIncomplete(
        parsedInput.data.document,
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

  try {
    const deceased = await prisma.deceased.update({
      where: { id: parsedId.data },
      data: {
        fullName: parsedInput.data.fullName,
        searchName: normalizeSearchName(parsedInput.data.fullName),
        document: parsedInput.data.document ?? null,
        birthDate: parsedInput.data.birthDate ?? null,
        deathDate: parsedInput.data.deathDate ?? null,
        burialDate: parsedInput.data.burialDate ?? null,
        datesUnknown: parsedInput.data.datesUnknown === true,
        historicalDataIncomplete: calculateHistoricalDataIncomplete(
          parsedInput.data.document,
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
