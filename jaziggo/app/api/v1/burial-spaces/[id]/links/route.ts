import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../../../lib/auth/permissions"
import {
  BurialSpaceServiceError,
  unlinkBurialSpace,
} from "../../../../../../services/burial-space-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../../types/api"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface BurialSpaceLinksRouteContext {
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

function successResponse(requestId: string) {
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
    error instanceof BurialSpaceServiceError
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

async function readConfirmationText(request: NextRequest) {
  const input = (await request.json().catch(() => null)) as DeleteRequestBody | null

  return typeof input?.confirmationText === "string"
    ? input.confirmationText
    : undefined
}

export async function DELETE(
  request: NextRequest,
  context: BurialSpaceLinksRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const { id } = await context.params
    const confirmationText = await readConfirmationText(request)

    await unlinkBurialSpace(id, confirmationText)

    return successResponse(requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}