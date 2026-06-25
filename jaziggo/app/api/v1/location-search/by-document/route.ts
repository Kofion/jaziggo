import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../lib/auth/permissions"
import type { LocationSearchItemDto } from "../../../../../lib/dto/location-search"
import { locationDocumentSearchSchema } from "../../../../../lib/validation/search"
import {
  LocationSearchServiceError,
  searchLocationsByDocument,
} from "../../../../../services/location-search-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../../../../types/api"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface LocationPageResponse extends PaginationMeta {
  data: LocationSearchItemDto[]
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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  if (request.nextUrl.searchParams.size > 0) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid request",
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

  const parsedInput = locationDocumentSearchSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid location search data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const result = await searchLocationsByDocument(parsedInput.data)
    const body: SuccessEnvelope<LocationPageResponse> = {
      success: true,
      data: {
        ...result.pagination,
        data: result.items,
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
