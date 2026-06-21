import type { PaginationParams } from "./api"
import type {
  BurialSpaceStatus,
  BurialSpaceType,
} from "./burial-space"
import type { IsoDateString, IsoDateTimeString } from "./deceased"

export const BURIAL_LINK_STATUS = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const

export type BurialLinkStatus =
  (typeof BURIAL_LINK_STATUS)[keyof typeof BURIAL_LINK_STATUS]

interface BurialLinkFields {
  id: string
  deceasedId: string
  burialSpaceId: string
  responsibleId?: string
  burialDate?: IsoDateString
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

export interface ActiveBurialLink extends BurialLinkFields {
  status: "ACTIVE"
  endedAt?: null
  endReason?: null
}

export interface EndedBurialLink extends BurialLinkFields {
  status: "ENDED"
  endedAt: IsoDateTimeString
  endReason: string
}

export type BurialLink = ActiveBurialLink | EndedBurialLink

export interface BurialLinkDeceasedSummaryDto {
  id: string
  internalCode: string
  fullName: string
  historicalDataIncomplete: boolean
}

export interface BurialLinkSpaceSummaryDto {
  id: string
  identifier: string
  type: BurialSpaceType
  status: BurialSpaceStatus
}

export interface BurialLinkResponsibleSummaryDto {
  id: string
  fullName: string
}

interface BurialLinkSummaries {
  deceased: BurialLinkDeceasedSummaryDto
  burialSpace: BurialLinkSpaceSummaryDto
  responsible?: BurialLinkResponsibleSummaryDto
}

type BurialLinkWithoutUpdatedAt =
  | Omit<ActiveBurialLink, "updatedAt">
  | Omit<EndedBurialLink, "updatedAt">

export type BurialLinkListItemDto = BurialLinkWithoutUpdatedAt &
  BurialLinkSummaries

export type BurialLinkDetailDto = BurialLink & BurialLinkSummaries

export interface CreateActiveBurialLinkCommand {
  deceasedId: string
  burialSpaceId: string
  responsibleId?: string
  burialDate?: IsoDateString
  confirmation?: true
}

export interface EndBurialLinkCommand {
  burialLinkId: string
  endedAt: IsoDateTimeString
  endReason: string
  confirmation: true
}

export interface BurialLinkListFilters extends PaginationParams {
  deceasedId?: string
  burialSpaceId?: string
  responsibleId?: string
  status?: BurialLinkStatus
  startDate?: IsoDateString
  endDate?: IsoDateString
}
