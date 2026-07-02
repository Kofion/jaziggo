import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../lib/auth/permissions"
import { updateResponsibleSchema } from "../../../../../lib/validation/responsible"
import {
  deleteResponsible,
  getResponsibleById,
  ResponsibleServiceError,
  updateResponsible,
} from "../../../../../services/responsible-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../types/api"
import type { ResponsibleDetailDto } from "../../../../../types/responsible"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface ResponsibleRouteContext {
  params: Promise<{ id: string }>
}

type DeleteRequestBody = Readonly<{
  confirmationText?: unknown
}>

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
  responsible: ResponsibleDetailDto,
  requestId: string,
) {
  const body: SuccessEnvelope<ResponsibleDetailDto> = {
    success: true,
    data: responsible,
    requestId,
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.OK,
    headers: NO_STORE_HEADERS,
  })
}

function deleteSuccessResponse(requestId: string) {
  const body: SuccessEnvelope<{ completed: true }> = {
    success: true,
    data: { completed: true },
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

async function getResponsibleId(
  context: ResponsibleRouteContext,
): Promise<string> {
  const { id } = await context.params

  return id
}

async function readDeleteBody(request: NextRequest) {
  const input = (await request.json().catch(() => null)) as DeleteRequestBody | null

  return typeof input?.confirmationText === "string"
    ? input.confirmationText
    : undefined
}

export async function GET(
  _request: NextRequest,
  context: ResponsibleRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const responsibleId = await getResponsibleId(context)
    const responsible = await getResponsibleById(responsibleId)

    return successResponse(responsible, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}

export async function PUT(
  request: NextRequest,
  context: ResponsibleRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const responsibleId = await getResponsibleId(context)
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

    const parsedInput = updateResponsibleSchema.safeParse(input)

    if (!parsedInput.success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid responsible data",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      )
    }

    await updateResponsible(responsibleId, parsedInput.data)
    const responsible = await getResponsibleById(responsibleId)

    return successResponse(responsible, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}

export async function DELETE(
  request: NextRequest,
  context: ResponsibleRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const responsibleId = await getResponsibleId(context)
    const confirmationText = await readDeleteBody(request)

    await deleteResponsible(responsibleId, confirmationText)

    return deleteSuccessResponse(requestId)
  } catch (error) {

    return handleError(error, requestId)
  }
}