import "server-only"

import type { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { withSerializableTransaction } from "../lib/db/transaction"
import { uuidSchema } from "../lib/validation/common"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
} from "../types/api"
import { PERMISSION } from "../types/auth"
import type { BurialSpaceStatus } from "../types/burial-space"

export const BURIAL_LINK_BLOCK_REASON = {
  SPACE_RESERVED: "SPACE_RESERVED",
  SPACE_INACTIVE: "SPACE_INACTIVE",
  SPACE_CAPACITY_REACHED: "SPACE_CAPACITY_REACHED",
  DECEASED_ALREADY_LINKED: "DECEASED_ALREADY_LINKED",
} as const

export type BurialLinkBlockReason =
  (typeof BURIAL_LINK_BLOCK_REASON)[keyof typeof BURIAL_LINK_BLOCK_REASON]

interface BurialLinkAvailabilityBase {
  burialSpaceId: string
  deceasedId: string
  status: BurialSpaceStatus
  capacity: number
  activeLinkCount: number
}

export type BurialLinkAvailability =
  | (BurialLinkAvailabilityBase & {
      canLink: true
      reasonCode?: never
    })
  | (BurialLinkAvailabilityBase & {
      canLink: false
      reasonCode: BurialLinkBlockReason
    })

type BurialLinkServiceErrorCode =
  | typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR
  | typeof DOMAIN_ERROR_CODE.NOT_FOUND

type BurialLinkServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.NOT_FOUND

export class BurialLinkServiceError extends Error {
  readonly code: BurialLinkServiceErrorCode
  readonly status: BurialLinkServiceErrorStatus

  private constructor(
    code: BurialLinkServiceErrorCode,
    status: BurialLinkServiceErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = "BurialLinkServiceError"
    this.code = code
    this.status = status
  }

  static validation(): BurialLinkServiceError {
    return new BurialLinkServiceError(
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "Invalid burial link data",
    )
  }

  static deceasedNotFound(): BurialLinkServiceError {
    return new BurialLinkServiceError(
      DOMAIN_ERROR_CODE.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      "Deceased not found",
    )
  }

  static burialSpaceNotFound(): BurialLinkServiceError {
    return new BurialLinkServiceError(
      DOMAIN_ERROR_CODE.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      "Burial space not found",
    )
  }
}

function blockedAvailability(
  base: BurialLinkAvailabilityBase,
  reasonCode: BurialLinkBlockReason,
): BurialLinkAvailability {
  return {
    ...base,
    canLink: false,
    reasonCode,
  }
}

export async function readBurialLinkAvailabilityInTransaction(
  transaction: Prisma.TransactionClient,
  deceasedId: string,
  burialSpaceId: string,
): Promise<BurialLinkAvailability> {
  const [deceased, burialSpace] = await Promise.all([
    transaction.deceased.findUnique({
      where: { id: deceasedId },
      select: {
        id: true,
        burialLinks: {
          where: { status: "ACTIVE" },
          select: { id: true },
          take: 1,
        },
      },
    }),
    transaction.burialSpace.findUnique({
      where: { id: burialSpaceId },
      select: {
        id: true,
        status: true,
        capacity: true,
        _count: {
          select: {
            burialLinks: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
    }),
  ])

  if (!deceased) {
    throw BurialLinkServiceError.deceasedNotFound()
  }

  if (!burialSpace) {
    throw BurialLinkServiceError.burialSpaceNotFound()
  }

  const availabilityBase: BurialLinkAvailabilityBase = {
    burialSpaceId: burialSpace.id,
    deceasedId: deceased.id,
    status: burialSpace.status,
    capacity: burialSpace.capacity,
    activeLinkCount: burialSpace._count.burialLinks,
  }

  if (burialSpace.status === "RESERVED") {
    return blockedAvailability(
      availabilityBase,
      BURIAL_LINK_BLOCK_REASON.SPACE_RESERVED,
    )
  }

  if (burialSpace.status === "INACTIVE") {
    return blockedAvailability(
      availabilityBase,
      BURIAL_LINK_BLOCK_REASON.SPACE_INACTIVE,
    )
  }

  if (deceased.burialLinks.length > 0) {
    return blockedAvailability(
      availabilityBase,
      BURIAL_LINK_BLOCK_REASON.DECEASED_ALREADY_LINKED,
    )
  }

  if (availabilityBase.activeLinkCount >= availabilityBase.capacity) {
    return blockedAvailability(
      availabilityBase,
      BURIAL_LINK_BLOCK_REASON.SPACE_CAPACITY_REACHED,
    )
  }

  return {
    ...availabilityBase,
    canLink: true,
  }
}

export async function readBurialLinkAvailability(
  deceasedId: string,
  burialSpaceId: string,
): Promise<BurialLinkAvailability> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedDeceasedId = uuidSchema.safeParse(deceasedId)
  const parsedBurialSpaceId = uuidSchema.safeParse(burialSpaceId)

  if (!parsedDeceasedId.success || !parsedBurialSpaceId.success) {
    throw BurialLinkServiceError.validation()
  }

  return withSerializableTransaction((transaction) =>
    readBurialLinkAvailabilityInTransaction(
      transaction,
      parsedDeceasedId.data,
      parsedBurialSpaceId.data,
    ),
  )
}