import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../lib/auth/permissions"
import type { LocationSearchItemDto } from "../../../../../lib/dto/location-search"
import {
  getLocationDetail,
  LocationSearchServiceError,
} from "../../../../../services/location-search-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../types/api"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface LocationDetailRouteContext {
  params: Promise<{ deceasedId: string }>
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
    error instanceof LocationSearchServiceError
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
  context: LocationDetailRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const { deceasedId } = await context.params
    const location = await getLocationDetail(deceasedId)
    const body: SuccessEnvelope<LocationSearchItemDto> = {
      success: true,
      data: location,
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
