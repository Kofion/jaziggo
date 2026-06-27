import { timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"

import { prisma } from "../../../../../../lib/db/prisma"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type ErrorEnvelope,
  type SuccessEnvelope,
} from "../../../../../../types/api"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }
const METRICS_TOKEN_HEADER = "x-metrics-token"
const SERVICE_UNAVAILABLE_STATUS = 503

interface HealthStatus {
  status: "ready"
}

function serviceUnavailableResponse(requestId: string) {
  const body: ErrorEnvelope = {
    success: false,
    error: {
      code: DOMAIN_ERROR_CODE.INTERNAL_ERROR,
      message: "Service unavailable",
    },
    requestId,
  }

  return NextResponse.json(body, {
    status: SERVICE_UNAVAILABLE_STATUS,
    headers: NO_STORE_HEADERS,
  })
}

function isAuthorized(request: NextRequest): boolean {
  const expectedToken = process.env.METRICS_TOKEN
  const providedToken = request.headers.get(METRICS_TOKEN_HEADER)

  if (!expectedToken || !providedToken) {
    return false
  }

  const expected = Buffer.from(expectedToken)
  const provided = Buffer.from(providedToken)

  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  )
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  if (!isAuthorized(request)) {
    return serviceUnavailableResponse(requestId)
  }

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    return serviceUnavailableResponse(requestId)
  }

  const body: SuccessEnvelope<HealthStatus> = {
    success: true,
    data: { status: "ready" },
    requestId,
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.OK,
    headers: NO_STORE_HEADERS,
  })
}
