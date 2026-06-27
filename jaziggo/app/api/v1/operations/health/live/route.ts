import { NextResponse } from "next/server"

import {
  HTTP_STATUS,
  type SuccessEnvelope,
} from "../../../../../../types/api"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface HealthStatus {
  status: "ok"
}

export async function GET() {
  const body: SuccessEnvelope<HealthStatus> = {
    success: true,
    data: { status: "ok" },
    requestId: crypto.randomUUID(),
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.OK,
    headers: NO_STORE_HEADERS,
  })
}
