import { NextRequest, NextResponse } from "next/server"

import {
  AuthorizationError,
  requirePermission,
} from "../../../../../../lib/auth/permissions"
import { updateBurialSpaceStatusSchema } from "../../../../../../lib/validation/burial-space"
import { uuidSchema } from "../../../../../../lib/validation/common"
import {
  BurialSpaceServiceError,
  updateBurialSpaceStatus,
} from "../../../../../../services/burial-space-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../../types/api"
import { PERMISSION } from "../../../../../../types/auth"
import type { BurialSpaceListItemDto } from "../../../../../../types/burial-space"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface BurialSpaceStatusRouteContext {
  params: Promise<{ id: string }>
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
  if (
    error instanceof AuthorizationError ||
    error instanceof BurialSpaceServiceError
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

async function authorizeAndParseId(
  context: BurialSpaceStatusRouteContext,
): Promise<string> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)

  if (!parsedId.success) {
    throw BurialSpaceServiceError.validation()
  }

  return parsedId.data
}

export async function PATCH(
  request: NextRequest,
  context: BurialSpaceStatusRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const burialSpaceId = await authorizeAndParseId(context)
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

    const parsedInput = updateBurialSpaceStatusSchema.safeParse(input)

    if (!parsedInput.success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid burial space status data",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      )
    }

    const space = await updateBurialSpaceStatus(
      burialSpaceId,
      parsedInput.data,
    )
    const body: SuccessEnvelope<BurialSpaceListItemDto> = {
      success: true,
      data: space,
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
