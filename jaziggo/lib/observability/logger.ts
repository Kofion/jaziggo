import "server-only"

import type { Permission } from "../../types/auth"
import type { UserRole } from "../../types/user"

export const LOG_LEVEL = {
  INFO: "info",
  WARN: "warn",
} as const

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL]

export const LOG_RESULT = {
  SUCCESS: "success",
  FAILURE: "failure",
  DENIED: "denied",
} as const

export type LogResult =
  (typeof LOG_RESULT)[keyof typeof LOG_RESULT]

export type AuthLogEvent =
  | "auth.login.succeeded"
  | "auth.login.failed"
  | "auth.logout.succeeded"
  | "auth.access.denied"

export type AuthLogOperation = "login" | "logout" | "authorize"

export type AuthLogMessage =
  | "Authentication succeeded"
  | "Authentication failed"
  | "Logout succeeded"
  | "Access denied"

export interface SafeLogMetadata {
  result: LogResult
  durationMs?: number
  role?: UserRole
  resource?: Permission
}

export interface StructuredLogInput {
  level: LogLevel
  module: "auth"
  operation: AuthLogOperation
  event: AuthLogEvent
  requestId: string
  userId?: string
  message: AuthLogMessage
  metadata: SafeLogMetadata
}

function safeDuration(durationMs: number | undefined): number | undefined {
  if (
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs < 0
  ) {
    return undefined
  }

  return Math.round(durationMs)
}

export function writeStructuredLog(input: StructuredLogInput): void {
  const durationMs = safeDuration(input.metadata.durationMs)
  const record = {
    timestamp: new Date().toISOString(),
    level: input.level,
    module: input.module,
    operation: input.operation,
    event: input.event,
    ...(input.userId ? { userId: input.userId } : {}),
    requestId: input.requestId,
    message: input.message,
    metadata: {
      result: input.metadata.result,
      ...(durationMs === undefined ? {} : { durationMs }),
      ...(input.metadata.role ? { role: input.metadata.role } : {}),
      ...(input.metadata.resource
        ? { resource: input.metadata.resource }
        : {}),
    },
  }
  const serializedRecord = JSON.stringify(record)

  if (input.level === LOG_LEVEL.WARN) {
    console.warn(serializedRecord)
    return
  }

  console.info(serializedRecord)
}
