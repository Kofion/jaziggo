import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../lib/auth/permissions"
import { createDeceasedSchema } from "../../../../../lib/validation/deceased"
import {
  checkDeceasedDuplicates,
  DeceasedServiceError,
} from "../../../../../services/deceased-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../../../../types/api"
import type { DeceasedDuplicateCandidateDto } from "../../../../../types/deceased"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }
const MAX_DUPLICATE_CANDIDATES = 25

interface DeceasedDuplicatePageResponse extends PaginationMeta {
  data: DeceasedDuplicateCandidateDto[]
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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
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

  const parsedInput = createDeceasedSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid deceased data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const candidates = await checkDeceasedDuplicates(parsedInput.data)
    const totalRecords = candidates.length
    const body: SuccessEnvelope<DeceasedDuplicatePageResponse> = {
      success: true,
      data: {
        page: 1,
        pageSize: MAX_DUPLICATE_CANDIDATES,
        totalRecords,
        totalPages: totalRecords === 0 ? 0 : 1,
        data: candidates,
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