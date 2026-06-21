import "server-only"

import { Prisma } from "@prisma/client"
import { z } from "zod"

import { hashPassword } from "../lib/auth/password"
import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import { toUserDto } from "../lib/dto/user"
import { paginationSchema } from "../lib/validation/pagination"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type PaginatedData,
  type PaginationParams,
} from "../types/api"
import { PERMISSION } from "../types/auth"
import {
  USER_ROLE,
  USER_STATUS,
  type CreateUserInput,
  type UpdateUserInput,
  type UserDto,
  type UserRole,
  type UserStatus,
} from "../types/user"

const userRoleSchema = z.enum([
  USER_ROLE.ADMIN,
  USER_ROLE.EMPLOYEE,
])

const userStatusSchema = z.enum([
  USER_STATUS.ACTIVE,
  USER_STATUS.INACTIVE,
])

const createUserSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(8),
    role: userRoleSchema,
  })
  .strict()

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email())
      .optional(),
    role: userRoleSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  })

const userIdSchema = z.uuid()

const listUsersSchema = paginationSchema
  .extend({
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .strict()

const USER_DTO_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
} as const satisfies Prisma.UserSelect

type UserServiceErrorCode =
  | typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR
  | typeof DOMAIN_ERROR_CODE.CONFLICT
  | typeof DOMAIN_ERROR_CODE.NOT_FOUND

type UserServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.CONFLICT
  | typeof HTTP_STATUS.NOT_FOUND

export class UserServiceError extends Error {
  readonly code: UserServiceErrorCode
  readonly status: UserServiceErrorStatus

  private constructor(
    code: UserServiceErrorCode,
    status: UserServiceErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = "UserServiceError"
    this.code = code
    this.status = status
  }

  static validation(): UserServiceError {
    return new UserServiceError(
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "Invalid user data",
    )
  }

  static conflict(): UserServiceError {
    return new UserServiceError(
      DOMAIN_ERROR_CODE.CONFLICT,
      HTTP_STATUS.CONFLICT,
      "User already exists",
    )
  }

  static notFound(): UserServiceError {
    return new UserServiceError(
      DOMAIN_ERROR_CODE.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      "User not found",
    )
  }
}

export interface ListUsersInput extends PaginationParams {
  role?: UserRole
  status?: UserStatus
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
}

export async function createUser(
  input: CreateUserInput,
): Promise<UserDto> {
  await requirePermission(PERMISSION.MANAGE_USERS)

  const parsedInput = createUserSchema.safeParse(input)

  if (!parsedInput.success) {
    throw UserServiceError.validation()
  }

  const passwordHash = await hashPassword(parsedInput.data.password)

  try {
    const user = await prisma.user.create({
      data: {
        name: parsedInput.data.name,
        email: parsedInput.data.email,
        passwordHash,
        role: parsedInput.data.role,
      },
      select: USER_DTO_SELECT,
    })

    return toUserDto(user)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw UserServiceError.conflict()
    }

    throw error
  }
}

export async function listUsers(
  input: ListUsersInput = {},
): Promise<PaginatedData<UserDto>> {
  await requirePermission(PERMISSION.MANAGE_USERS)

  const parsedInput = listUsersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw UserServiceError.validation()
  }

  const { page, pageSize, role, status } = parsedInput.data
  const skip = (page - 1) * pageSize

  if (!Number.isSafeInteger(skip)) {
    throw UserServiceError.validation()
  }

  const where: Prisma.UserWhereInput = {
    role,
    status,
  }
  const [users, totalRecords] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: USER_DTO_SELECT,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return {
    items: users.map(toUserDto),
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
    },
  }
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<UserDto> {
  await requirePermission(PERMISSION.MANAGE_USERS)

  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = updateUserSchema.safeParse(input)

  if (!parsedUserId.success || !parsedInput.success) {
    throw UserServiceError.validation()
  }

  try {
    const user = await prisma.user.update({
      where: { id: parsedUserId.data },
      data: parsedInput.data,
      select: USER_DTO_SELECT,
    })

    return toUserDto(user)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw UserServiceError.conflict()
    }

    if (isRecordNotFoundError(error)) {
      throw UserServiceError.notFound()
    }

    throw error
  }
}

export async function deactivateUser(userId: string): Promise<void> {
  await requirePermission(PERMISSION.MANAGE_USERS)

  const parsedUserId = userIdSchema.safeParse(userId)

  if (!parsedUserId.success) {
    throw UserServiceError.validation()
  }

  try {
    await prisma.user.update({
      where: { id: parsedUserId.data },
      data: { status: USER_STATUS.INACTIVE },
      select: { id: true },
    })
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      throw UserServiceError.notFound()
    }

    throw error
  }
}
