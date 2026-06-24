import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../../lib/auth/permissions"
import {
  toBurialLinkAvailabilityDto,
  type BurialLinkAvailabilityDto,
} from "../../../../../../lib/dto/burial-link"
import { uuidSchema } from "../../../../../../lib/validation/common"
import {
  BurialLinkServiceError,
  readBurialLinkAvailability,
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
const ALLOWED_QUERY_PARAMS = new Set(["deceasedId"])

interface ValidateBurialSpaceRouteContext {
  params: Promise<{ spaceId: string }>
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

function hasUnknownQueryParameter(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) {
      return true
    }
  }

  return false
}

export async function GET(
  request: NextRequest,
  context: ValidateBurialSpaceRouteContext,
) {
  const requestId = crypto.randomUUID()

  if (hasUnknownQueryParameter(request.nextUrl.searchParams)) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  const parsedDeceasedId = uuidSchema.safeParse(
    request.nextUrl.searchParams.get("deceasedId"),
  )

  if (!parsedDeceasedId.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const { spaceId } = await context.params
    const availability = await readBurialLinkAvailability(
      parsedDeceasedId.data,
      spaceId,
    )
    const body: SuccessEnvelope<BurialLinkAvailabilityDto> = {
      success: true,
      data: toBurialLinkAvailabilityDto(availability),
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
