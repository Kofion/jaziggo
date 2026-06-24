import "server-only"

import type { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { withSerializableTransaction } from "../lib/db/transaction"
import {
  createBurialLinkSchema,
  type CreateBurialLinkInput,
} from "../lib/validation/burial-link"
import { uuidSchema } from "../lib/validation/common"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
} from "../types/api"
import { PERMISSION } from "../types/auth"
import type { ActiveBurialLink } from "../types/burial-link"
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
  | typeof DOMAIN_ERROR_CODE.CONFLICT

type BurialLinkServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.NOT_FOUND
  | typeof HTTP_STATUS.CONFLICT

export class BurialLinkServiceError extends Error {
  readonly code: BurialLinkServiceErrorCode
  readonly status: BurialLinkServiceErrorStatus
  readonly reasonCode?: BurialLinkBlockReason

  private constructor(
    code: BurialLinkServiceErrorCode,
    status: BurialLinkServiceErrorStatus,
    message: string,
    reasonCode?: BurialLinkBlockReason,
  ) {
    super(message)
    this.name = "BurialLinkServiceError"
    this.code = code
    this.status = status
    this.reasonCode = reasonCode
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

  static responsibleNotFound(): BurialLinkServiceError {
    return new BurialLinkServiceError(
      DOMAIN_ERROR_CODE.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      "Responsible not found",
    )
  }

  static conflict(
    reasonCode: BurialLinkBlockReason,
  ): BurialLinkServiceError {
    return new BurialLinkServiceError(
      DOMAIN_ERROR_CODE.CONFLICT,
      HTTP_STATUS.CONFLICT,
      "Burial link conflicts with current occupancy",
      reasonCode,
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

function toIsoDate(value: Date | null): string | undefined {
  return value?.toISOString().slice(0, 10)
}

function toActiveBurialLink(link: {
  id: string
  deceasedId: string
  burialSpaceId: string
  responsibleId: string | null
  burialDate: Date | null
  status: "ACTIVE"
  endedAt: Date | null
  endReason: string | null
  createdAt: Date
  updatedAt: Date
}): ActiveBurialLink {
  const burialDate = toIsoDate(link.burialDate)

  return {
    id: link.id,
    deceasedId: link.deceasedId,
    burialSpaceId: link.burialSpaceId,
    status: link.status,
    endedAt: null,
    endReason: null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    ...(link.responsibleId
      ? { responsibleId: link.responsibleId }
      : {}),
    ...(burialDate ? { burialDate } : {}),
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

export async function createBurialLink(
  input: CreateBurialLinkInput,
): Promise<ActiveBurialLink> {
  await requirePermission(PERMISSION.MANAGE_OPERATIONAL_RECORDS)

  const parsedInput = createBurialLinkSchema.safeParse(input)

  if (!parsedInput.success) {
    throw BurialLinkServiceError.validation()
  }

  return withSerializableTransaction(async (transaction) => {
    const availability = await readBurialLinkAvailabilityInTransaction(
      transaction,
      parsedInput.data.deceasedId,
      parsedInput.data.burialSpaceId,
    )

    if (!availability.canLink) {
      throw BurialLinkServiceError.conflict(availability.reasonCode)
    }

    if (parsedInput.data.responsibleId) {
      const responsible = await transaction.responsible.findUnique({
        where: { id: parsedInput.data.responsibleId },
        select: { id: true },
      })

      if (!responsible) {
        throw BurialLinkServiceError.responsibleNotFound()
      }
    }

    const burialLink = await transaction.burialLink.create({
      data: {
        deceasedId: parsedInput.data.deceasedId,
        burialSpaceId: parsedInput.data.burialSpaceId,
        responsibleId: parsedInput.data.responsibleId,
        burialDate: parsedInput.data.burialDate,
        status: "ACTIVE",
      },
      select: {
        id: true,
        deceasedId: true,
        burialSpaceId: true,
        responsibleId: true,
        burialDate: true,
        status: true,
        endedAt: true,
        endReason: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await transaction.burialSpace.update({
      where: { id: availability.burialSpaceId },
      data: { status: "OCCUPIED" },
      select: { id: true },
    })

    return toActiveBurialLink({
      ...burialLink,
      status: "ACTIVE",
    })
  })
}
