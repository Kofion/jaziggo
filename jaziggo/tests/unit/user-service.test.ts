import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

import { DOMAIN_ERROR_CODE, HTTP_STATUS } from "@/types/api"
import {
  USER_ROLE,
  USER_STATUS,
  type UserDto,
} from "@/types/user"
import {
  TEST_USER_PASSWORD,
  activeEmployeeUserFixture,
  adminUserFixture,
} from "@/tests/fixtures/users"

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))
const hashPasswordMock = vi.hoisted(() => vi.fn())
const requirePermissionMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    readonly code: string

    constructor(
      message: string,
      options: { code: string; clientVersion?: string },
    ) {
      super(message)
      this.name = "PrismaClientKnownRequestError"
      this.code = options.code
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError,
    },
    PrismaClient: vi.fn(() => prismaMock),
  }
})

vi.mock("@/lib/auth/password", () => ({
  hashPassword: hashPasswordMock,
}))

vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: requirePermissionMock,
}))

const {
  UserServiceError,
  createUser,
  deactivateUser,
  getUserById,
  listUsers,
  updateUser,
} = await import("@/services/user-service")

function userDto(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: overrides.id ?? adminUserFixture.id,
    name: overrides.name ?? adminUserFixture.name,
    email: overrides.email ?? adminUserFixture.email,
    role: overrides.role ?? adminUserFixture.role,
    status: overrides.status ?? adminUserFixture.status,
  }
}

function prismaError(code: "P2002" | "P2025"): Error {
  return new Prisma.PrismaClientKnownRequestError("Prisma error", {
    code,
    clientVersion: "test",
  })
}

describe("UserService", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset()
    prismaMock.user.count.mockReset()
    prismaMock.user.create.mockReset()
    prismaMock.user.findMany.mockReset()
    prismaMock.user.findUnique.mockReset()
    prismaMock.user.update.mockReset()
    hashPasswordMock.mockReset()
    requirePermissionMock.mockReset()
    requirePermissionMock.mockResolvedValue(userDto())
  })

  it("creates users with normalized data and returns a DTO without password data", async () => {
    hashPasswordMock.mockResolvedValue("hashed-password")
    prismaMock.user.create.mockResolvedValue(
      userDto({
        name: "Active Employee",
        email: "employee@example.com",
        role: USER_ROLE.EMPLOYEE,
      }),
    )

    const result = await createUser({
      name: " Active Employee ",
      email: " EMPLOYEE@EXAMPLE.COM ",
      password: TEST_USER_PASSWORD,
      role: USER_ROLE.EMPLOYEE,
    })

    expect(hashPasswordMock).toHaveBeenCalledWith(TEST_USER_PASSWORD)
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        name: "Active Employee",
        email: "employee@example.com",
        passwordHash: "hashed-password",
        role: USER_ROLE.EMPLOYEE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    })
    expect(result).toEqual({
      id: adminUserFixture.id,
      name: "Active Employee",
      email: "employee@example.com",
      role: USER_ROLE.EMPLOYEE,
      status: USER_STATUS.ACTIVE,
    })
    expect(result).not.toHaveProperty("password")
    expect(result).not.toHaveProperty("passwordHash")
  })

  it("rejects invalid creation input before hashing or writing", async () => {
    await expect(
      createUser({
        name: "Invalid Role",
        email: "invalid@example.com",
        password: TEST_USER_PASSWORD,
        role: "ATTENDANT" as typeof USER_ROLE.ADMIN,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    expect(hashPasswordMock).not.toHaveBeenCalled()
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it("maps duplicate email creation to conflict", async () => {
    hashPasswordMock.mockResolvedValue("hashed-password")
    prismaMock.user.create.mockRejectedValue(prismaError("P2002"))

    await expect(
      createUser({
        name: adminUserFixture.name,
        email: adminUserFixture.email,
        password: TEST_USER_PASSWORD,
        role: USER_ROLE.ADMIN,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.CONFLICT,
      status: HTTP_STATUS.CONFLICT,
    })
  })

  it("lists users with filters and pagination", async () => {
    prismaMock.$transaction.mockResolvedValue([
      [userDto(), userDto(activeEmployeeUserFixture)],
      2,
    ])

    await expect(
      listUsers({
        page: 2,
        pageSize: 10,
        role: USER_ROLE.EMPLOYEE,
        status: USER_STATUS.ACTIVE,
      }),
    ).resolves.toEqual({
      items: [userDto(), userDto(activeEmployeeUserFixture)],
      pagination: {
        page: 2,
        pageSize: 10,
        totalRecords: 2,
        totalPages: 1,
      },
    })

    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      prismaMock.user.findMany({
        where: {
          role: USER_ROLE.EMPLOYEE,
          status: USER_STATUS.ACTIVE,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: 10,
        take: 10,
      }),
      prismaMock.user.count({
        where: {
          role: USER_ROLE.EMPLOYEE,
          status: USER_STATUS.ACTIVE,
        },
      }),
    ])
  })

  it("rejects invalid list filters", async () => {
    await expect(
      listUsers({
        page: 1,
        pageSize: 25,
        role: "ATTENDANT" as typeof USER_ROLE.ADMIN,
      }),
    ).rejects.toBeInstanceOf(UserServiceError)

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("updates editable fields with normalized values", async () => {
    prismaMock.user.update.mockResolvedValue(
      userDto({
        name: "Updated User",
        email: "updated@example.com",
        role: USER_ROLE.EMPLOYEE,
      }),
    )

    await expect(
      updateUser(adminUserFixture.id, {
        name: " Updated User ",
        email: " UPDATED@EXAMPLE.COM ",
        role: USER_ROLE.EMPLOYEE,
      }),
    ).resolves.toEqual(
      userDto({
        name: "Updated User",
        email: "updated@example.com",
        role: USER_ROLE.EMPLOYEE,
      }),
    )

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: adminUserFixture.id },
      data: {
        name: "Updated User",
        email: "updated@example.com",
        role: USER_ROLE.EMPLOYEE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    })
  })

  it("maps duplicate email and missing records during update", async () => {
    prismaMock.user.update.mockRejectedValueOnce(prismaError("P2002"))
    await expect(
      updateUser(adminUserFixture.id, {
        email: activeEmployeeUserFixture.email,
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.CONFLICT,
      status: HTTP_STATUS.CONFLICT,
    })

    prismaMock.user.update.mockRejectedValueOnce(prismaError("P2025"))
    await expect(
      updateUser(adminUserFixture.id, {
        name: "Missing User",
      }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
    })
  })

  it("rejects invalid update payloads", async () => {
    await expect(updateUser(adminUserFixture.id, {})).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })
    await expect(
      updateUser("not-a-uuid", { name: "Updated User" }),
    ).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it("deactivates users without deleting them", async () => {
    prismaMock.user.update.mockResolvedValue({ id: activeEmployeeUserFixture.id })

    await expect(
      deactivateUser(activeEmployeeUserFixture.id),
    ).resolves.toBeUndefined()

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: activeEmployeeUserFixture.id },
      data: { status: USER_STATUS.INACTIVE },
      select: { id: true },
    })
  })

  it("maps invalid and missing records during deactivation", async () => {
    await expect(deactivateUser("not-a-uuid")).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    prismaMock.user.update.mockRejectedValueOnce(prismaError("P2025"))
    await expect(deactivateUser(activeEmployeeUserFixture.id)).rejects.toMatchObject(
      {
        code: DOMAIN_ERROR_CODE.NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND,
      },
    )
  })

  it("gets users by id without sensitive fields", async () => {
    prismaMock.user.findUnique.mockResolvedValue(userDto(activeEmployeeUserFixture))

    await expect(getUserById(activeEmployeeUserFixture.id)).resolves.toEqual(
      userDto(activeEmployeeUserFixture),
    )
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: activeEmployeeUserFixture.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    })
  })

  it("maps invalid and missing records during lookup", async () => {
    await expect(getUserById("not-a-uuid")).rejects.toMatchObject({
      code: DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    })

    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    await expect(getUserById(activeEmployeeUserFixture.id)).rejects.toMatchObject(
      {
        code: DOMAIN_ERROR_CODE.NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND,
      },
    )
  })
})
