import { NextRequest, NextResponse } from "next/server"

import {
  AuthorizationError,
  requirePermission,
} from "../../../../../lib/auth/permissions"
import { updateBurialSpaceSchema } from "../../../../../lib/validation/burial-space"
import { uuidSchema } from "../../../../../lib/validation/common"
import {
  BurialSpaceServiceError,
  deleteBurialSpace,
  getBurialSpaceById,
  updateBurialSpace,
} from "../../../../../services/burial-space-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../types/api"
import { PERMISSION } from "../../../../../types/auth"
import type {
  BurialSpaceListItemDto,
  UpdateBurialSpaceInput,
} from "../../../../../types/burial-space"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface BurialSpaceRouteContext {
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
  space: BurialSpaceListItemDto,
  requestId: string,
) {
  const body: SuccessEnvelope<BurialSpaceListItemDto> = {
    success: true,
    data: space,
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
    error instanceof BurialSpaceServiceError
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

async function authorizeAndParseId(
  context: BurialSpaceRouteContext,
): Promise<string> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)

  if (!parsedId.success) {
    throw BurialSpaceServiceError.validation()
  }

  return parsedId.data
}

async function readDeleteBody(request: NextRequest) {
  const input = (await request.json().catch(() => null)) as DeleteRequestBody | null

  return typeof input?.confirmationText === "string"
    ? input.confirmationText
    : undefined
}

export async function GET(
  _request: NextRequest,
  context: BurialSpaceRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const burialSpaceId = await authorizeAndParseId(context)
    const space = await getBurialSpaceById(burialSpaceId)

    return successResponse(space, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}

export async function PUT(
  request: NextRequest,
  context: BurialSpaceRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const burialSpaceId = await authorizeAndParseId(context)
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

    const parsedInput = updateBurialSpaceSchema.safeParse(input)

    if (!parsedInput.success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid burial space data",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      )
    }

    const space = await updateBurialSpace(
      burialSpaceId,
      input as UpdateBurialSpaceInput,
    )

    return successResponse(space, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}

export async function DELETE(
  request: NextRequest,
  context: BurialSpaceRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const burialSpaceId = await authorizeAndParseId(context)
    const confirmationText = await readDeleteBody(request)

    await deleteBurialSpace(burialSpaceId, confirmationText)

    return deleteSuccessResponse(requestId)
  } catch (error) {

    return handleError(error, requestId)
  }
}