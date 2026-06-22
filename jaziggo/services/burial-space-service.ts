import "server-only"

import { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import { toBurialSpaceDto } from "../lib/dto/burial-space"
import {
  burialSpaceListFiltersSchema,
  createBurialSpaceSchema,
  type BurialSpaceListFiltersInput,
} from "../lib/validation/burial-space"
import { uuidSchema } from "../lib/validation/common"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type PaginatedData,
} from "../types/api"
import { PERMISSION } from "../types/auth"
import type {
  BurialSpaceListItemDto,
  CreateBurialSpaceInput,
} from "../types/burial-space"

const BURIAL_SPACE_DTO_SELECT = {
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

type BurialSpaceServiceErrorCode =
  | typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR
  | typeof DOMAIN_ERROR_CODE.CONFLICT
  | typeof DOMAIN_ERROR_CODE.NOT_FOUND

type BurialSpaceServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.CONFLICT
  | typeof HTTP_STATUS.NOT_FOUND

export class BurialSpaceServiceError extends Error {
  readonly code: BurialSpaceServiceErrorCode
  readonly status: BurialSpaceServiceErrorStatus

  private constructor(
    code: BurialSpaceServiceErrorCode,
    status: BurialSpaceServiceErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = "BurialSpaceServiceError"
    this.code = code
    this.status = status
  }

  static validation(): BurialSpaceServiceError {
    return new BurialSpaceServiceError(
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "Invalid burial space data",
    )
  }

  static conflict(): BurialSpaceServiceError {
    return new BurialSpaceServiceError(
      DOMAIN_ERROR_CODE.CONFLICT,
      HTTP_STATUS.CONFLICT,
      "Burial space already exists",
    )
  }

  static notFound(): BurialSpaceServiceError {
    return new BurialSpaceServiceError(
      DOMAIN_ERROR_CODE.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      "Burial space not found",
    )
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

export async function createBurialSpace(
  input: CreateBurialSpaceInput,
): Promise<BurialSpaceListItemDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = createBurialSpaceSchema.safeParse(input)

  if (!parsedInput.success) {
    throw BurialSpaceServiceError.validation()
  }

  try {
    const space = await prisma.burialSpace.create({
      data: parsedInput.data,
      select: BURIAL_SPACE_DTO_SELECT,
    })

    return toBurialSpaceDto({
      ...space,
      activeLinkCount: space._count.burialLinks,
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw BurialSpaceServiceError.conflict()
    }

    throw error
  }
}

export async function listBurialSpaces(
  input: BurialSpaceListFiltersInput = {},
): Promise<PaginatedData<BurialSpaceListItemDto>> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = burialSpaceListFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw BurialSpaceServiceError.validation()
  }

  const {
    page,
    pageSize,
    identifier,
    type,
    status,
    sector,
    block,
    street,
    row,
    number,
    complement,
  } = parsedInput.data
  const skip = (page - 1) * pageSize

  if (!Number.isSafeInteger(skip)) {
    throw BurialSpaceServiceError.validation()
  }

  const where: Prisma.BurialSpaceWhereInput = {
    identifier,
    type,
    status,
    sector,
    block,
    street,
    row,
    number,
    complement,
  }
  const [spaces, totalRecords] = await prisma.$transaction([
    prisma.burialSpace.findMany({
      where,
      select: BURIAL_SPACE_DTO_SELECT,
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

  return {
    items: spaces.map((space) =>
      toBurialSpaceDto({
        ...space,
        activeLinkCount: space._count.burialLinks,
      }),
    ),
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
    },
  }
}

export async function getBurialSpaceById(
  burialSpaceId: string,
): Promise<BurialSpaceListItemDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedId = uuidSchema.safeParse(burialSpaceId)

  if (!parsedId.success) {
    throw BurialSpaceServiceError.validation()
  }

  const space = await prisma.burialSpace.findUnique({
    where: { id: parsedId.data },
    select: BURIAL_SPACE_DTO_SELECT,
  })

  if (!space) {
    throw BurialSpaceServiceError.notFound()
  }

  return toBurialSpaceDto({
    ...space,
    activeLinkCount: space._count.burialLinks,
  })
}
