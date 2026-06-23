import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { AuthorizationError } from "../../../../../../lib/auth/permissions"
import {
  requiredTrimmedStringSchema,
  uuidSchema,
} from "../../../../../../lib/validation/common"
import {
  endResponsibleLink,
  ResponsibleServiceError,
} from "../../../../../../services/responsible-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../../types/api"
import type { ResponsibleLinkDto } from "../../../../../../types/responsible"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const endResponsibleLinkSchema = z
  .object({
    endedAt: z.iso.datetime(),
    endReason: requiredTrimmedStringSchema,
    confirmation: z.literal(true),
  })
  .strict()

interface ResponsibleLinkEndRouteContext {
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
    status: HTTP_STATUS.OK,
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

async function getResponsibleLinkId(
  context: ResponsibleLinkEndRouteContext,
): Promise<string> {
  const { id } = await context.params

  return id
}

export async function PATCH(
  request: NextRequest,
  context: ResponsibleLinkEndRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const responsibleLinkId = await getResponsibleLinkId(context)

    if (!uuidSchema.safeParse(responsibleLinkId).success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid responsible link id",
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

    const parsedInput = endResponsibleLinkSchema.safeParse(input)

    if (!parsedInput.success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid responsible link end data",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      )
    }

    const responsibleLink = await endResponsibleLink({
      responsibleLinkId,
      ...parsedInput.data,
    })

    return successResponse(responsibleLink, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}
