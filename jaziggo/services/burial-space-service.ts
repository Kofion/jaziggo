import "server-only"

import { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import { toBurialSpaceDto } from "../lib/dto/burial-space"
import { createBurialSpaceSchema } from "../lib/validation/burial-space"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
} from "../types/api"
import { PERMISSION } from "../types/auth"
import type {
  BurialSpaceListItemDto,
  CreateBurialSpaceInput,
} from "../types/burial-space"

const BURIAL_SPACE_DTO_SELECT = {
  id: true,
  type: true,
  identifier: true,
  sector: true,
  block: true,
  street: true,
  row: true,
  number: true,
  complement: true,
  status: true,
  capacity: true,
} as const satisfies Prisma.BurialSpaceSelect

type BurialSpaceServiceErrorCode =
  | typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR
  | typeof DOMAIN_ERROR_CODE.CONFLICT

type BurialSpaceServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.CONFLICT

export class BurialSpaceServiceError extends Error {
  readonly code: BurialSpaceServiceErrorCode
  readonly status: BurialSpaceServiceErrorStatus

  private constructor(
    code: BurialSpaceServiceErrorCode,
    status: BurialSpaceServiceErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = "BurialSpaceServiceError"
    this.code = code
    this.status = status
  }

  static validation(): BurialSpaceServiceError {
    return new BurialSpaceServiceError(
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "Invalid burial space data",
    )
  }

  static conflict(): BurialSpaceServiceError {
    return new BurialSpaceServiceError(
      DOMAIN_ERROR_CODE.CONFLICT,
      HTTP_STATUS.CONFLICT,
      "Burial space already exists",
    )
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

export async function createBurialSpace(
  input: CreateBurialSpaceInput,
): Promise<BurialSpaceListItemDto> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = createBurialSpaceSchema.safeParse(input)

  if (!parsedInput.success) {
    throw BurialSpaceServiceError.validation()
  }

  try {
    const space = await prisma.burialSpace.create({
      data: parsedInput.data,
      select: BURIAL_SPACE_DTO_SELECT,
    })

    return toBurialSpaceDto({
      ...space,
      activeLinkCount: 0,
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw BurialSpaceServiceError.conflict()
    }

    throw error
  }
}
