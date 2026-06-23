import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { AuthorizationError } from "../../../../../lib/auth/permissions"
import { uuidSchema } from "../../../../../lib/validation/common"
import {
  createResponsibleLink,
  ResponsibleServiceError,
} from "../../../../../services/responsible-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../types/api"
import {
  RESPONSIBLE_LINK_TYPE,
  type ResponsibleLinkDto,
} from "../../../../../types/responsible"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const createDeceasedResponsibleLinkSchema = z
  .object({
    responsibleId: uuidSchema,
    linkType: z.literal(RESPONSIBLE_LINK_TYPE.DECEASED),
    deceasedId: uuidSchema,
    burialSpaceId: z.never().optional(),
  })
  .strict()

const createBurialSpaceResponsibleLinkSchema = z
  .object({
    responsibleId: uuidSchema,
    linkType: z.literal(RESPONSIBLE_LINK_TYPE.BURIAL_SPACE),
    burialSpaceId: uuidSchema,
    deceasedId: z.never().optional(),
  })
  .strict()

const createResponsibleLinkSchema = z.union([
  createDeceasedResponsibleLinkSchema,
  createBurialSpaceResponsibleLinkSchema,
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

function successResponse(
  responsibleLink: ResponsibleLinkDto,
  requestId: string,
) {
  const body: SuccessEnvelope<ResponsibleLinkDto> = {
    success: true,
    data: responsibleLink,
    requestId,
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.CREATED,
    headers: NO_STORE_HEADERS,
  })
}

function handleError(error: unknown, requestId: string) {
  if (
    error instanceof AuthorizationError ||
    error instanceof ResponsibleServiceError
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

  const parsedInput = createResponsibleLinkSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid responsible link data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const responsibleLink = await createResponsibleLink(parsedInput.data)

    return successResponse(responsibleLink, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}
