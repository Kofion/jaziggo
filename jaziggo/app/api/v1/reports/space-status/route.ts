import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../lib/auth/permissions"
import { spaceReportQuerySchema } from "../../../../../lib/validation/report"
import {
  generateSpaceStatusReport,
  ReportServiceError,
} from "../../../../../services/report-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../types/api"
import type { SpaceStatusReportDto } from "../../../../../types/report"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }
const ALLOWED_QUERY_PARAMS = new Set([
  "page",
  "pageSize",
  "status",
  "type",
  "sector",
])

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
    error instanceof ReportServiceError
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
  const parsedQuery = spaceReportQuerySchema.safeParse(query)

  if (!parsedQuery.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const report = await generateSpaceStatusReport(parsedQuery.data)
    const body: SuccessEnvelope<SpaceStatusReportDto> = {
      success: true,
      data: report,
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
