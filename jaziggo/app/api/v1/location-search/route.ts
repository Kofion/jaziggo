import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../lib/auth/permissions"
import { locationSearchFiltersSchema } from "../../../../lib/validation/search"
import {
  LocationSearchServiceError,
  searchLocations,
} from "../../../../services/location-search-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../../../types/api"
import type { LocationSearchItemDto } from "../../../../lib/dto/location-search"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }
const ALLOWED_QUERY_PARAMS = new Set([
  "page",
  "pageSize",
  "deceasedName",
  "responsibleName",
  "deathDate",
  "burialDate",
  "sector",
  "burialSpaceIdentifier",
])

const locationSearchQuerySchema = locationSearchFiltersSchema.pick({
  page: true,
  pageSize: true,
  deceasedName: true,
  responsibleName: true,
  deathDate: true,
  burialDate: true,
  sector: true,
  burialSpaceIdentifier: true,
})

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

function hasUnknownQueryParameter(
  searchParams: URLSearchParams,
): boolean {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) {
      return true
    }
  }

  return false
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  if (hasUnknownQueryParameter(request.nextUrl.searchParams)) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  const query = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  )
  const parsedQuery = locationSearchQuerySchema.safeParse(query)

  if (!parsedQuery.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const result = await searchLocations(parsedQuery.data)
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
