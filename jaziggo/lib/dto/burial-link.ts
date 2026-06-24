import "server-only"

import type {
  ActiveBurialLink,
  EndedBurialLink,
} from "../../types/burial-link"
import type { BurialSpaceStatus } from "../../types/burial-space"

type DateLike = Date | string

interface BurialLinkDtoSource {
  id: string
  deceasedId: string
  burialSpaceId: string
  responsibleId?: string | null
  burialDate?: DateLike | null
  status: "ACTIVE" | "ENDED"
  endedAt?: DateLike | null
  endReason?: string | null
  createdAt: DateLike
}

interface BurialLinkAvailabilityDtoSource {
  canLink: boolean
  reasonCode?: string
  status: BurialSpaceStatus
  capacity: number
  activeLinkCount: number
}

export type BurialLinkDto =
  | Omit<ActiveBurialLink, "updatedAt">
  | Omit<EndedBurialLink, "updatedAt">

export type BurialLinkAvailabilityDto =
  | {
      canLink: true
      status: BurialSpaceStatus
      capacity: number
      activeLinkCount: number
      reasonCode?: never
    }
  | {
      canLink: false
      status: BurialSpaceStatus
      capacity: number
      activeLinkCount: number
      reasonCode: string
    }

function toIsoDate(value: DateLike | null | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  return (value instanceof Date ? value.toISOString() : value).slice(0, 10)
}

function toIsoDateTime(value: DateLike): string {
  return value instanceof Date ? value.toISOString() : value
}

export function toBurialLinkDto(
  link: BurialLinkDtoSource,
): BurialLinkDto {
  const burialDate = toIsoDate(link.burialDate)
  const base = {
    id: link.id,
    deceasedId: link.deceasedId,
    burialSpaceId: link.burialSpaceId,
    createdAt: toIsoDateTime(link.createdAt),
    ...(link.responsibleId
      ? { responsibleId: link.responsibleId }
      : {}),
    ...(burialDate ? { burialDate } : {}),
  }

  if (link.status === "ACTIVE") {
    if (link.endedAt != null || link.endReason != null) {
      throw new Error("Invalid active burial link lifecycle")
    }

    return {
      ...base,
      status: "ACTIVE",
    }
  }

  if (!link.endedAt || !link.endReason) {
    throw new Error("Invalid ended burial link lifecycle")
  }

  return {
    ...base,
    status: "ENDED",
    endedAt: toIsoDateTime(link.endedAt),
    endReason: link.endReason,
  }
}

export function toBurialLinkAvailabilityDto(
  availability: BurialLinkAvailabilityDtoSource,
): BurialLinkAvailabilityDto {
  const base = {
    status: availability.status,
    capacity: availability.capacity,
    activeLinkCount: availability.activeLinkCount,
  }

  if (availability.canLink) {
    return {
      ...base,
      canLink: true,
    }
  }

  if (!availability.reasonCode) {
    throw new Error("Blocked burial link availability requires a reason")
  }

  return {
    ...base,
    canLink: false,
    reasonCode: availability.reasonCode,
  }
}
