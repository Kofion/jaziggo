import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../lib/auth/permissions"
import { deceasedExactDocumentSearchSchema } from "../../../../../lib/validation/deceased"
import {
  DeceasedServiceError,
  searchDeceasedByDocument,
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
import type { DeceasedListItemDto } from "../../../../../types/deceased"

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
}

interface DeceasedPageResponse extends PaginationMeta {
  data: DeceasedListItemDto[]
}

function errorResponse(
  requestId: string,
  code: DomainErrorCode,
  message: string,
  status: HttpStatus,
) {
  const body: ErrorEnvelope = {
    success: false,
    error: {
      code,
      message,
    },
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
    return errorResponse(requestId, error.code, error.message, error.status)
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

  const parsedInput = deceasedExactDocumentSearchSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid document search data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const result = await searchDeceasedByDocument(parsedInput.data)

    const body: SuccessEnvelope<DeceasedPageResponse> = {
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
