import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../lib/auth/permissions"
import {
  toBurialLinkDto,
  type BurialLinkDto,
} from "../../../../lib/dto/burial-link"
import {
  createBurialLinkSchema,
} from "../../../../lib/validation/burial-link"
import {
  BurialLinkServiceError,
  createBurialLink,
} from "../../../../services/burial-link-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../types/api"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

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

  const parsedInput = createBurialLinkSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid burial link data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const burialLink = await createBurialLink({
      deceasedId: parsedInput.data.deceasedId,
      burialSpaceId: parsedInput.data.burialSpaceId,
      responsibleId: parsedInput.data.responsibleId,
      confirmation: parsedInput.data.confirmation,
    })
    const body: SuccessEnvelope<BurialLinkDto> = {
      success: true,
      data: toBurialLinkDto(burialLink),
      requestId,
    }

    return NextResponse.json(body, {
      status: HTTP_STATUS.CREATED,
      headers: NO_STORE_HEADERS,
    })
  } catch (error) {
    return handleError(error, requestId)
  }
}
