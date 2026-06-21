import "server-only"

import type { Permission } from "../../types/auth"
import type { UserRole } from "../../types/user"
import {
  LOG_LEVEL,
  LOG_RESULT,
  writeStructuredLog,
} from "../observability/logger"

interface AuditContext {
  requestId: string
  durationMs?: number
}

interface IdentifiedAuditContext extends AuditContext {
  userId: string
}

interface AccessDeniedAuditContext extends IdentifiedAuditContext {
  role: UserRole
  permission: Permission
}

export function auditLoginSucceeded(
  context: IdentifiedAuditContext,
): void {
  writeStructuredLog({
    level: LOG_LEVEL.INFO,
    module: "auth",
    operation: "login",
    event: "auth.login.succeeded",
    userId: context.userId,
    requestId: context.requestId,
    message: "Authentication succeeded",
    metadata: {
      result: LOG_RESULT.SUCCESS,
      durationMs: context.durationMs,
    },
  })
}

export function auditLoginFailed(context: AuditContext): void {
  writeStructuredLog({
    level: LOG_LEVEL.WARN,
    module: "auth",
    operation: "login",
    event: "auth.login.failed",
    requestId: context.requestId,
    message: "Authentication failed",
    metadata: {
      result: LOG_RESULT.FAILURE,
      durationMs: context.durationMs,
    },
  })
}

export function auditLogoutSucceeded(
  context: IdentifiedAuditContext,
): void {
  writeStructuredLog({
    level: LOG_LEVEL.INFO,
    module: "auth",
    operation: "logout",
    event: "auth.logout.succeeded",
    userId: context.userId,
    requestId: context.requestId,
    message: "Logout succeeded",
    metadata: {
      result: LOG_RESULT.SUCCESS,
      durationMs: context.durationMs,
    },
  })
}

export function auditAccessDenied(
  context: AccessDeniedAuditContext,
): void {
  writeStructuredLog({
    level: LOG_LEVEL.WARN,
    module: "auth",
    operation: "authorize",
    event: "auth.access.denied",
    userId: context.userId,
    requestId: context.requestId,
    message: "Access denied",
    metadata: {
      result: LOG_RESULT.DENIED,
      durationMs: context.durationMs,
      role: context.role,
      resource: context.permission,
    },
  })
}
