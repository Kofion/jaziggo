import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../../lib/auth/permissions"
import {
  toBurialLinkDto,
  type BurialLinkDto,
} from "../../../../../../lib/dto/burial-link"
import { endBurialLinkSchema } from "../../../../../../lib/validation/burial-link"
import { uuidSchema } from "../../../../../../lib/validation/common"
import {
  BurialLinkServiceError,
  endBurialLink,
} from "../../../../../../services/burial-link-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../../types/api"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface BurialLinkEndRouteContext {
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

function successResponse(
  burialLink: BurialLinkDto,
  requestId: string,
) {
  const body: SuccessEnvelope<BurialLinkDto> = {
    success: true,
    data: burialLink,
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
    error instanceof BurialLinkServiceError
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

export async function PATCH(
  request: NextRequest,
  context: BurialLinkEndRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const { id } = await context.params
    const parsedBurialLinkId = uuidSchema.safeParse(id)

    if (!parsedBurialLinkId.success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid burial link id",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      )
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

    const parsedInput = endBurialLinkSchema.safeParse(input)

    if (!parsedInput.success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid burial link end data",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      )
    }

    const burialLink = await endBurialLink({
      burialLinkId: parsedBurialLinkId.data,
      ...parsedInput.data,
    })

    return successResponse(toBurialLinkDto(burialLink), requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}
