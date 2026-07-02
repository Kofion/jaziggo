import { NextRequest, NextResponse } from "next/server"

import {
  AuthorizationError,
  requirePermission,
} from "../../../../../lib/auth/permissions"
import { uuidSchema } from "../../../../../lib/validation/common"
import { updateDeceasedSchema } from "../../../../../lib/validation/deceased"
import {
  DeceasedServiceError,
  deleteDeceased,
  getDeceasedById,
  updateDeceased,
} from "../../../../../services/deceased-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../types/api"
import { PERMISSION, type Permission } from "../../../../../types/auth"
import type { DeceasedDetailDto } from "../../../../../types/deceased"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface DeceasedRouteContext {
  params: Promise<{ id: string }>
}

type DeleteRequestBody = Readonly<{
  confirmationText?: unknown
}>

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

function successResponse<TDeceased extends DeceasedDetailDto>(
  deceased: TDeceased,
  requestId: string,
) {
  const body: SuccessEnvelope<TDeceased> = {
    success: true,
    data: deceased,
    requestId,
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.OK,
    headers: NO_STORE_HEADERS,
  })
}

function deleteSuccessResponse(requestId: string) {
  const body: SuccessEnvelope<{ completed: true }> = {
    success: true,
    data: { completed: true },
    requestId,
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.OK,
    headers: NO_STORE_HEADERS,
  })
}

function handleError(error: unknown, requestId: string) {
  if (
    error instanceof AuthorizationError ||
    error instanceof DeceasedServiceError
  ) {
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

async function authorizeAndParseDeceasedId(
  context: DeceasedRouteContext,
  permission: Permission,
): Promise<string> {
  await requirePermission(permission)

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)

  if (!parsedId.success) {
    throw DeceasedServiceError.validation()
  }

  return parsedId.data
}

async function readDeleteBody(request: NextRequest) {
  const input = (await request.json().catch(() => null)) as DeleteRequestBody | null

  return typeof input?.confirmationText === "string"
    ? input.confirmationText
    : undefined
}

export async function GET(
  _request: NextRequest,
  context: DeceasedRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const deceasedId = await authorizeAndParseDeceasedId(
      context,
      PERMISSION.SEARCH_RECORDS,
    )
    const deceased = await getDeceasedById(deceasedId)

    return successResponse(deceased, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}

export async function PUT(
  request: NextRequest,
  context: DeceasedRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const deceasedId = await authorizeAndParseDeceasedId(
      context,
      PERMISSION.MANAGE_OPERATIONAL_RECORDS,
    )
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

    const parsedInput = updateDeceasedSchema.safeParse(input)

    if (!parsedInput.success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid deceased data",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      )
    }

    const deceased = await updateDeceased(deceasedId, parsedInput.data)

    return successResponse(deceased, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}

export async function DELETE(
  request: NextRequest,
  context: DeceasedRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const deceasedId = await authorizeAndParseDeceasedId(
      context,
      PERMISSION.MANAGE_OPERATIONAL_RECORDS,
    )
    const confirmationText = await readDeleteBody(request)

    await deleteDeceased(deceasedId, confirmationText)

    return deleteSuccessResponse(requestId)
  } catch (error) {

    return handleError(error, requestId)
  }
}