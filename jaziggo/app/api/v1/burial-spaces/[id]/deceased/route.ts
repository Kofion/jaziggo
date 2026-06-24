import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../../lib/auth/permissions"
import {
  toBurialLinkDto,
  type BurialLinkDto,
} from "../../../../../../lib/dto/burial-link"
import { burialLinkStatusSchema } from "../../../../../../lib/validation/burial-link"
import {
  BurialLinkServiceError,
  listBurialLinksBySpace,
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
const ALLOWED_QUERY_PARAMS = new Set(["linkStatus"])

interface BurialSpaceDeceasedRouteContext {
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
  context: BurialSpaceDeceasedRouteContext,
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

  const parsedLinkStatus = burialLinkStatusSchema
    .optional()
    .safeParse(request.nextUrl.searchParams.get("linkStatus") ?? undefined)

  if (!parsedLinkStatus.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const { id: burialSpaceId } = await context.params
    const burialLinks = await listBurialLinksBySpace(burialSpaceId)
    const data = burialLinks
      .filter(
        (link) =>
          parsedLinkStatus.data === undefined ||
          link.status === parsedLinkStatus.data,
      )
      .map(toBurialLinkDto)
    const body: SuccessEnvelope<BurialLinkDto[]> = {
      success: true,
      data,
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
