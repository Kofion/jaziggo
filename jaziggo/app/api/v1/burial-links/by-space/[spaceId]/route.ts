import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../../lib/auth/permissions"
import {
  toBurialLinkDto,
  type BurialLinkDto,
} from "../../../../../../lib/dto/burial-link"
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

interface BurialLinksBySpaceRouteContext {
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

export async function GET(
  _request: NextRequest,
  context: BurialLinksBySpaceRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const { spaceId } = await context.params
    const burialLinks = await listBurialLinksBySpace(spaceId)
    const body: SuccessEnvelope<BurialLinkDto[]> = {
      success: true,
      data: burialLinks.map(toBurialLinkDto),
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
