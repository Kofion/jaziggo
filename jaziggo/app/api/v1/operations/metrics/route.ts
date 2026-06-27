import { timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"

import { collectMetricsSnapshot } from "../../../../../lib/observability/metrics"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type ErrorEnvelope,
  type SuccessEnvelope,
} from "../../../../../types/api"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }
const METRICS_TOKEN_HEADER = "x-metrics-token"

type MetricsSnapshot = Awaited<ReturnType<typeof collectMetricsSnapshot>>

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

function forbiddenResponse(requestId: string) {
  const body: ErrorEnvelope = {
    success: false,
    error: {
      code: DOMAIN_ERROR_CODE.FORBIDDEN,
      message: "Forbidden",
    },
    requestId,
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.FORBIDDEN,
    headers: NO_STORE_HEADERS,
  })
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  if (!isAuthorized(request)) {
    return forbiddenResponse(requestId)
  }

  const body: SuccessEnvelope<MetricsSnapshot> = {
    success: true,
    data: await collectMetricsSnapshot(),
    requestId,
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.OK,
    headers: NO_STORE_HEADERS,
  })
}