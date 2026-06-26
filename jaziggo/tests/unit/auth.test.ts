import { beforeEach, describe, expect, it, vi } from "vitest"

import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "@/types/api"
import { PERMISSION } from "@/types/auth"
import {
  USER_ROLE,
  USER_STATUS,
  type UserRole,
  type UserStatus,
} from "@/types/user"

const findUniqueMock = vi.hoisted(() => vi.fn())
const getServerSessionMock = vi.hoisted(() => vi.fn())
const hashMock = vi.hoisted(() => vi.fn())
const verifyMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      findUnique: findUniqueMock,
    },
  })),
}))

vi.mock("next-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-auth")>()

  return {
    ...actual,
    getServerSession: getServerSessionMock,
  }
})

vi.mock("argon2", () => ({
  argon2id: 2,
  hash: hashMock,
  verify: verifyMock,
}))

const { authenticateCredentials, getActiveUserById } = await import(
  "@/lib/auth/dal"
)
const { AuthorizationError, hasPermission, requirePermission, requireRole } =
  await import("@/lib/auth/permissions")
const { getCurrentActiveUser } = await import("@/lib/auth/session")
const { hashPassword, verifyPassword } = await import("@/lib/auth/password")

interface UserRecord {
  id: string
  name: string
  email: string
  passwordHash?: string
  role: UserRole
  status: UserStatus
}

function userRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-1",
    name: "Admin User",
    email: "admin@example.com",
    passwordHash: "stored-hash",
    role: USER_ROLE.ADMIN,
    status: USER_STATUS.ACTIVE,
    ...overrides,
  }
}

describe("auth password helpers", () => {
  beforeEach(() => {
    hashMock.mockReset()
    verifyMock.mockReset()
  })

  it("hashes passwords using Argon2id parameters", async () => {
    hashMock.mockResolvedValue("$argon2id$hash")

    await expect(hashPassword("valid-password")).resolves.toBe("$argon2id$hash")

    expect(hashMock).toHaveBeenCalledWith("valid-password", {
      type: 2,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 1,
    })
  })

  it("rejects empty password hashing input", async () => {
    await expect(hashPassword("")).rejects.toThrow(TypeError)
    expect(hashMock).not.toHaveBeenCalled()
  })

  it("verifies passwords without leaking verifier failures", async () => {
    verifyMock.mockResolvedValueOnce(true)
    verifyMock.mockRejectedValueOnce(new Error("invalid hash"))

    await expect(verifyPassword("valid-password", "stored-hash")).resolves.toBe(
      true,
    )
    await expect(verifyPassword("valid-password", "broken-hash")).resolves.toBe(
      false,
    )
    await expect(verifyPassword("", "stored-hash")).resolves.toBe(false)
    await expect(verifyPassword("valid-password", "")).resolves.toBe(false)
  })
})

describe("auth data access", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    verifyMock.mockReset()
  })

  it.each([USER_ROLE.ADMIN, USER_ROLE.EMPLOYEE])(
    "authenticates active %s credentials",
    async (role) => {
      findUniqueMock.mockResolvedValue(userRecord({ role }))
      verifyMock.mockResolvedValue(true)

      await expect(
        authenticateCredentials({
          email: " ADMIN@EXAMPLE.COM ",
          password: "valid-password",
        }),
      ).resolves.toEqual({
        id: "user-1",
        name: "Admin User",
        email: "admin@example.com",
        role,
        status: USER_STATUS.ACTIVE,
      })

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { email: "admin@example.com" },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true,
          status: true,
        },
      })
    },
  )

  it("does not authenticate inactive users", async () => {
    findUniqueMock.mockResolvedValue(
      userRecord({ status: USER_STATUS.INACTIVE }),
    )

    await expect(
      authenticateCredentials({
        email: "inactive@example.com",
        password: "valid-password",
      }),
    ).resolves.toBeNull()

    expect(verifyMock).not.toHaveBeenCalled()
  })

  it("does not authenticate invalid credentials or unsupported roles", async () => {
    findUniqueMock.mockResolvedValueOnce(null)
    await expect(
      authenticateCredentials({
        email: "missing@example.com",
        password: "valid-password",
      }),
    ).resolves.toBeNull()

    findUniqueMock.mockResolvedValueOnce(userRecord())
    verifyMock.mockResolvedValueOnce(false)
    await expect(
      authenticateCredentials({
        email: "admin@example.com",
        password: "wrong-password",
      }),
    ).resolves.toBeNull()

    findUniqueMock.mockResolvedValueOnce(
      userRecord({ role: "ATTENDANT" as UserRole }),
    )
    await expect(
      authenticateCredentials({
        email: "attendant@example.com",
        password: "valid-password",
      }),
    ).resolves.toBeNull()
  })

  it("returns only active ADMIN and EMPLOYEE users by id", async () => {
    findUniqueMock.mockResolvedValueOnce(userRecord({ role: USER_ROLE.ADMIN }))
    await expect(getActiveUserById("admin-1")).resolves.toMatchObject({
      role: USER_ROLE.ADMIN,
      status: USER_STATUS.ACTIVE,
    })

    findUniqueMock.mockResolvedValueOnce(userRecord({ role: USER_ROLE.EMPLOYEE }))
    await expect(getActiveUserById("employee-1")).resolves.toMatchObject({
      role: USER_ROLE.EMPLOYEE,
      status: USER_STATUS.ACTIVE,
    })

    findUniqueMock.mockResolvedValueOnce(
      userRecord({ status: USER_STATUS.INACTIVE }),
    )
    await expect(getActiveUserById("inactive-1")).resolves.toBeNull()

    findUniqueMock.mockResolvedValueOnce(
      userRecord({ role: "ATTENDANT" as UserRole }),
    )
    await expect(getActiveUserById("attendant-1")).resolves.toBeNull()
  })
})

describe("auth session and permissions", () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    getServerSessionMock.mockReset()
  })

  it("resolves active users from a server session", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: USER_ROLE.ADMIN },
    })
    findUniqueMock.mockResolvedValue(userRecord({ id: "admin-1" }))

    await expect(getCurrentActiveUser()).resolves.toMatchObject({
      id: "admin-1",
      role: USER_ROLE.ADMIN,
      status: USER_STATUS.ACTIVE,
    })
  })

  it("treats anonymous and inactive sessions as unauthenticated", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    await expect(getCurrentActiveUser()).resolves.toBeNull()

    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "inactive-1", role: USER_ROLE.EMPLOYEE },
    })
    findUniqueMock.mockResolvedValueOnce(
      userRecord({
        id: "inactive-1",
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.INACTIVE,
      }),
    )
    await expect(getCurrentActiveUser()).resolves.toBeNull()
  })

  it("keeps the permission matrix limited to ADMIN and EMPLOYEE", () => {
    expect(hasPermission(USER_ROLE.ADMIN, PERMISSION.VIEW_REPORTS)).toBe(true)
    expect(hasPermission(USER_ROLE.ADMIN, PERMISSION.MANAGE_USERS)).toBe(true)
    expect(
      hasPermission(USER_ROLE.ADMIN, PERMISSION.MANAGE_OPERATIONAL_RECORDS),
    ).toBe(true)

    expect(hasPermission(USER_ROLE.EMPLOYEE, PERMISSION.VIEW_REPORTS)).toBe(
      false,
    )
    expect(hasPermission(USER_ROLE.EMPLOYEE, PERMISSION.MANAGE_USERS)).toBe(
      false,
    )
    expect(
      hasPermission(USER_ROLE.EMPLOYEE, PERMISSION.MANAGE_OPERATIONAL_RECORDS),
    ).toBe(true)
    expect(hasPermission(USER_ROLE.EMPLOYEE, PERMISSION.SEARCH_RECORDS)).toBe(
      true,
    )
  })

  it("allows ADMIN-only requirements and rejects EMPLOYEE users", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "employee-1", role: USER_ROLE.EMPLOYEE },
    })
    findUniqueMock.mockResolvedValue(userRecord({ role: USER_ROLE.EMPLOYEE }))

    await expect(requireRole(USER_ROLE.ADMIN)).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.FORBIDDEN,
      status: HTTP_STATUS.FORBIDDEN,
    })
    await expect(
      requirePermission(PERMISSION.VIEW_REPORTS),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it("rejects anonymous access before checking permissions", async () => {
    getServerSessionMock.mockResolvedValue(null)

    await expect(requireRole(USER_ROLE.ADMIN)).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.UNAUTHORIZED,
      status: HTTP_STATUS.UNAUTHORIZED,
    })
    await expect(
      requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.UNAUTHORIZED,
      status: HTTP_STATUS.UNAUTHORIZED,
    })
  })
})
