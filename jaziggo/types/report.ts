import type { PaginationMeta } from "./api"
import type {
  BurialLinkStatus,
} from "./burial-link"
import type {
  BurialSpaceStatus,
  BurialSpaceType,
} from "./burial-space"
import type {
  IsoDateString,
  IsoDateTimeString,
} from "./deceased"

export interface ReportPeriodFilters {
  startDate?: IsoDateString
  endDate?: IsoDateString
}

export type DeceasedReportFilters = ReportPeriodFilters

export interface BurialsByPeriodReportFilters
  extends ReportPeriodFilters {
  linkStatus?: BurialLinkStatus
}

export interface SpaceReportFilters {
  status?: BurialSpaceStatus
  type?: BurialSpaceType
  sector?: string
  linkStatus?: BurialLinkStatus
}

export interface PaginatedReportDto<
  TItem,
  TFilters extends object,
> extends PaginationMeta {
  title: string
  generatedAt: IsoDateTimeString
  filters: TFilters
  data: TItem[]
  emptyMessage?: string
}

export interface DeceasedReportItemDto {
  id: string
  internalCode: string
  fullName: string
  documentMasked?: string
  deathDate?: IsoDateString
  burialDate?: IsoDateString
  historicalDataIncomplete: boolean
  createdAt: IsoDateTimeString
}

export interface BurialByPeriodReportItemDto {
  burialLinkId: string
  burialDate?: IsoDateString
  linkStatus: BurialLinkStatus
  deceasedId: string
  internalCode: string
  deceasedName: string
  deceasedDocumentMasked?: string
  burialSpaceId: string
  burialSpaceType: BurialSpaceType
  burialSpaceIdentifier: string
  burialSpaceStatus: BurialSpaceStatus
  locationDescription: string
}

export interface SpaceOccupationReportItemDto {
  burialSpaceId: string
  burialSpaceType: BurialSpaceType
  identifier: string
  locationDescription: string
  status: BurialSpaceStatus
  capacity: number
  activeLinkCount: number
  availableCapacity: number
}

export interface SpaceStatusReportItemDto {
  burialSpaceId: string
  burialSpaceType: BurialSpaceType
  identifier: string
  locationDescription: string
  status: BurialSpaceStatus
  capacity: number
  activeLinkCount: number
}

export type DeceasedReportDto = PaginatedReportDto<
  DeceasedReportItemDto,
  DeceasedReportFilters
>

export type BurialsByPeriodReportDto = PaginatedReportDto<
  BurialByPeriodReportItemDto,
  BurialsByPeriodReportFilters
>

export type SpaceOccupationReportDto = PaginatedReportDto<
  SpaceOccupationReportItemDto,
  SpaceReportFilters
>

export type SpaceStatusReportDto = PaginatedReportDto<
  SpaceStatusReportItemDto,
  SpaceReportFilters
>
