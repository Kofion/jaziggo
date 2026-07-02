import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

import {
  AuthorizationError,
  requirePermission,
} from "../../../../../lib/auth/permissions"
import { prisma } from "../../../../../lib/db/prisma"
import { toResponsibleListItemDto } from "../../../../../lib/dto/responsible"
import { responsibleSensitiveSearchFiltersSchema } from "../../../../../lib/validation/responsible"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../../../../types/api"
import { PERMISSION } from "../../../../../types/auth"
import type { ResponsibleListItemDto } from "../../../../../types/responsible"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const RESPONSIBLE_LIST_DTO_SELECT = {
  id: true,
  fullName: true,
  document: true,
  documentType: true,
} as const satisfies Prisma.ResponsibleSelect

interface ResponsiblePageResponse extends PaginationMeta {
  data: ResponsibleListItemDto[]
}

function errorResponse(
  requestId: string,
  code: DomainErrorCode,
  message: string,
  status: HttpStatus,
) {
  const body: ErrorEnvelope = {
    success: false,
    error: { code, message },
    requestId,
  }

  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  })
}

function handleError(error: unknown, requestId: string) {
  if (error instanceof AuthorizationError) {
    return errorResponse(
      requestId,
      error.code,
      error.message,
      error.status,
    )
  }

  return errorResponse(
    requestId,
    DOMAIN_ERROR_CODE.INTERNAL_ERROR,
    "Unable to complete request",
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  )
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    await requirePermission(PERMISSION.SEARCH_RECORDS)
  } catch (error) {
    return handleError(error, requestId)
  }

  let input: unknown

  try {
    input = await request.json()
  } catch {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid request body",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  const parsedInput =
    responsibleSensitiveSearchFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid responsible search data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  const { page, pageSize } = parsedInput.data
  const skip = (page - 1) * pageSize

  if (!Number.isSafeInteger(skip)) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid responsible search data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  const where: Prisma.ResponsibleWhereInput =
    "document" in parsedInput.data
      ? {
          documentType: parsedInput.data.documentType,
          document: parsedInput.data.document,
        }
      : { phone: parsedInput.data.phone }

  try {
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

    const body: SuccessEnvelope<ResponsiblePageResponse> = {
      success: true,
      data: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
        data: responsibles.map(toResponsibleListItemDto),
      },
      requestId,
    }

    return NextResponse.json(body, {
      status: HTTP_STATUS.OK,
      headers: NO_STORE_HEADERS,
    })
  } catch (error) {
    return handleError(error, requestId)
  }
}
