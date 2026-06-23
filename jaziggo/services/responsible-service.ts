import "server-only"

import { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import {
  toResponsibleDetailDto,
  toResponsibleListItemDto,
} from "../lib/dto/responsible"
import { uuidSchema } from "../lib/validation/common"
import { normalizeSearchName } from "../lib/validation/normalize"
import {
  createResponsibleSchema,
  type CreateResponsibleInput,
  responsibleListFiltersSchema,
  type ResponsibleListFiltersInput,
  type UpdateResponsibleInput,
  updateResponsibleSchema,
} from "../lib/validation/responsible"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type PaginatedData,
} from "../types/api"
import { PERMISSION } from "../types/auth"
import type {
  ResponsibleDetailDto,
  ResponsibleLinkDto,
  ResponsibleListItemDto,
} from "../types/responsible"

const RESPONSIBLE_LIST_DTO_SELECT = {
  id: true,
  fullName: true,
  document: true,
} as const satisfies Prisma.ResponsibleSelect

const RESPONSIBLE_LINK_DTO_SELECT = {
  id: true,
  responsibleId: true,
  linkType: true,
  deceasedId: true,
  burialSpaceId: true,
  status: true,
  endedAt: true,
  endReason: true,
  createdAt: true,
} as const satisfies Prisma.ResponsibleLinkSelect

const RESPONSIBLE_DETAIL_DTO_SELECT = {
  ...RESPONSIBLE_LIST_DTO_SELECT,
  phone: true,
  email: true,
  address: true,
  links: {
    select: RESPONSIBLE_LINK_DTO_SELECT,
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
      { id: "asc" },
    ],
  },
} as const satisfies Prisma.ResponsibleSelect

type ResponsibleLinkDtoSource = Prisma.ResponsibleLinkGetPayload<{
  select: typeof RESPONSIBLE_LINK_DTO_SELECT
}>

type ResponsibleServiceErrorCode =
  | typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR
  | typeof DOMAIN_ERROR_CODE.NOT_FOUND

type ResponsibleServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.NOT_FOUND

export class ResponsibleServiceError extends Error {
  readonly code: ResponsibleServiceErrorCode
  readonly status: ResponsibleServiceErrorStatus

  private constructor(
    code: ResponsibleServiceErrorCode,
    status: ResponsibleServiceErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = "ResponsibleServiceError"
    this.code = code
    this.status = status
  }

  static validation(): ResponsibleServiceError {
    return new ResponsibleServiceError(
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "Invalid responsible data",
    )
  }

  static notFound(): ResponsibleServiceError {
    return new ResponsibleServiceError(
      DOMAIN_ERROR_CODE.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      "Responsible not found",
    )
  }
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
}

function toResponsibleLinkDto(
  link: ResponsibleLinkDtoSource,
): ResponsibleLinkDto {
  const base = {
    id: link.id,
    responsibleId: link.responsibleId,
    createdAt: link.createdAt.toISOString(),
  }

  if (link.linkType === "DECEASED") {
    if (link.deceasedId === null || link.burialSpaceId !== null) {
      throw new Error("Invalid responsible link target")
    }

    if (link.status === "ACTIVE") {
      if (link.endedAt !== null || link.endReason !== null) {
        throw new Error("Invalid active responsible link lifecycle")
      }

      return {
        ...base,
        linkType: "DECEASED",
        deceasedId: link.deceasedId,
        status: "ACTIVE",
      }
    }

    if (link.endedAt === null || link.endReason === null) {
      throw new Error("Invalid ended responsible link lifecycle")
    }

    return {
      ...base,
      linkType: "DECEASED",
      deceasedId: link.deceasedId,
      status: "ENDED",
      endedAt: link.endedAt.toISOString(),
      endReason: link.endReason,
    }
  }

  if (link.burialSpaceId === null || link.deceasedId !== null) {
    throw new Error("Invalid responsible link target")
  }

  if (link.status === "ACTIVE") {
    if (link.endedAt !== null || link.endReason !== null) {
      throw new Error("Invalid active responsible link lifecycle")
    }

    return {
      ...base,
      linkType: "BURIAL_SPACE",
      burialSpaceId: link.burialSpaceId,
      status: "ACTIVE",
    }
  }

  if (link.endedAt === null || link.endReason === null) {
    throw new Error("Invalid ended responsible link lifecycle")
  }

  return {
    ...base,
    linkType: "BURIAL_SPACE",
    burialSpaceId: link.burialSpaceId,
    status: "ENDED",
    endedAt: link.endedAt.toISOString(),
    endReason: link.endReason,
  }
}

export async function createResponsible(
  input: CreateResponsibleInput,
): Promise<ResponsibleListItemDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = createResponsibleSchema.safeParse(input)

  if (!parsedInput.success) {
    throw ResponsibleServiceError.validation()
  }

  const responsible = await prisma.responsible.create({
    data: {
      ...parsedInput.data,
      searchName: normalizeSearchName(parsedInput.data.fullName),
    },
    select: RESPONSIBLE_LIST_DTO_SELECT,
  })

  return toResponsibleListItemDto(responsible)
}

export async function updateResponsible(
  responsibleId: string,
  input: UpdateResponsibleInput,
): Promise<ResponsibleListItemDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedId = uuidSchema.safeParse(responsibleId)
  const parsedInput = updateResponsibleSchema.safeParse(input)

  if (!parsedId.success || !parsedInput.success) {
    throw ResponsibleServiceError.validation()
  }

  const { fullName, ...contactData } = parsedInput.data

  try {
    const responsible = await prisma.responsible.update({
      where: { id: parsedId.data },
      data: {
        ...contactData,
        ...(fullName === undefined
          ? {}
          : {
              fullName,
              searchName: normalizeSearchName(fullName),
            }),
      },
      select: RESPONSIBLE_LIST_DTO_SELECT,
    })

    return toResponsibleListItemDto(responsible)
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw ResponsibleServiceError.notFound()
    }

    throw error
  }
}

export async function listResponsibles(
  input: ResponsibleListFiltersInput = {},
): Promise<PaginatedData<ResponsibleListItemDto>> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = responsibleListFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw ResponsibleServiceError.validation()
  }

  const { page, pageSize, name } = parsedInput.data
  const skip = (page - 1) * pageSize

  if (!Number.isSafeInteger(skip)) {
    throw ResponsibleServiceError.validation()
  }

  const where: Prisma.ResponsibleWhereInput = {
    searchName: name === undefined ? undefined : { contains: name },
  }
  const [responsibles, totalRecords] = await prisma.$transaction([
    prisma.responsible.findMany({
      where,
      select: RESPONSIBLE_LIST_DTO_SELECT,
      orderBy: [{ searchName: "asc" }, { id: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.responsible.count({ where }),
  ])

  return {
    items: responsibles.map(toResponsibleListItemDto),
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
    },
  }
}

export async function getResponsibleById(
  responsibleId: string,
): Promise<ResponsibleDetailDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedId = uuidSchema.safeParse(responsibleId)

  if (!parsedId.success) {
    throw ResponsibleServiceError.validation()
  }

  const responsible = await prisma.responsible.findUnique({
    where: { id: parsedId.data },
    select: RESPONSIBLE_DETAIL_DTO_SELECT,
  })

  if (!responsible) {
    throw ResponsibleServiceError.notFound()
  }

  return toResponsibleDetailDto({
    ...responsible,
    links: responsible.links.map(toResponsibleLinkDto),
  })
}
