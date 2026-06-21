import "server-only"

import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
} from "../../types/api"
import {
  ROLE_PERMISSIONS,
  type Permission,
} from "../../types/auth"
import type { UserRole } from "../../types/user"
import { getCurrentActiveUser } from "./session"
import type { ActiveAuthUser } from "./dal"

type AuthorizationErrorCode =
  | typeof DOMAIN_ERROR_CODE.UNAUTHORIZED
  | typeof DOMAIN_ERROR_CODE.FORBIDDEN

type AuthorizationHttpStatus =
  | typeof HTTP_STATUS.UNAUTHORIZED
  | typeof HTTP_STATUS.FORBIDDEN

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode
  readonly status: AuthorizationHttpStatus

  private constructor(
    code: AuthorizationErrorCode,
    status: AuthorizationHttpStatus,
    message: string,
  ) {
    super(message)
    this.name = "AuthorizationError"
    this.code = code
    this.status = status
  }

  static unauthorized(): AuthorizationError {
    return new AuthorizationError(
      DOMAIN_ERROR_CODE.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      "Authentication required",
    )
  }

  static forbidden(): AuthorizationError {
    return new AuthorizationError(
      DOMAIN_ERROR_CODE.FORBIDDEN,
      HTTP_STATUS.FORBIDDEN,
      "Access denied",
    )
  }
}

export function hasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  const permissions: readonly Permission[] = ROLE_PERMISSIONS[role]

  return permissions.includes(permission)
}

async function requireActiveUser(): Promise<ActiveAuthUser> {
  const user = await getCurrentActiveUser()

  if (!user) {
    throw AuthorizationError.unauthorized()
  }

  return user
}

export async function requireRole(
  ...allowedRoles: readonly UserRole[]
): Promise<ActiveAuthUser> {
  const user = await requireActiveUser()

  if (!allowedRoles.includes(user.role)) {
    throw AuthorizationError.forbidden()
  }

  return user
}

export async function requirePermission(
  permission: Permission,
): Promise<ActiveAuthUser> {
  const user = await requireActiveUser()

  if (!hasPermission(user.role, permission)) {
    throw AuthorizationError.forbidden()
  }

  return user
}
