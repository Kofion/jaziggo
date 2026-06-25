import "server-only"

import type { PaginationMeta } from "../../types/api"
import type { BurialLinkStatus } from "../../types/burial-link"
import type {
  BurialSpaceLocation,
  BurialSpaceStatus,
  BurialSpaceType,
} from "../../types/burial-space"
import type {
  DeceasedReportItemDto,
  PaginatedReportDto,
  BurialByPeriodReportItemDto,
  SpaceOccupationReportItemDto,
  SpaceStatusReportItemDto,
} from "../../types/report"
import { formatLocation } from "../location/format-location"
import { maskDocument } from "../privacy/mask-document"

type DateLike = Date | string

interface DeceasedReportItemSource {
  id: string
  internalCode: string
  fullName: string
  document: string | null
  deathDate: DateLike | null
  burialDate: DateLike | null
  historicalDataIncomplete: boolean
  createdAt: DateLike
}

interface BurialByPeriodReportItemSource {
  id: string
  burialDate: DateLike | null
  status: BurialLinkStatus
  deceased: {
    id: string
    internalCode: string
    fullName: string
    document: string | null
  }
  burialSpace: BurialSpaceLocation & {
    id: string
    type: BurialSpaceType
    identifier: string
    status: BurialSpaceStatus
  }
}

interface SpaceReportItemSource extends BurialSpaceLocation {
  id: string
  type: BurialSpaceType
  identifier: string
  status: BurialSpaceStatus
  capacity: number
  activeLinkCount: number
}

interface PaginatedReportSource<
  TItem,
  TFilters extends object,
> {
  title: string
  generatedAt: DateLike
  filters: TFilters
  items: TItem[]
  pagination: PaginationMeta
  emptyMessage?: string
}

function toIsoDate(
  value: DateLike | null,
): string | undefined {
  if (!value) {
    return undefined
  }

  return (value instanceof Date ? value.toISOString() : value).slice(
    0,
    10,
  )
}

function toIsoDateTime(value: DateLike): string {
  return value instanceof Date ? value.toISOString() : value
}

function toMaskedDocument(
  document: string | null,
): string | undefined {
  return maskDocument(document) || undefined
}

export function toDeceasedReportItemDto(
  deceased: DeceasedReportItemSource,
): DeceasedReportItemDto {
  const documentMasked = toMaskedDocument(deceased.document)
  const deathDate = toIsoDate(deceased.deathDate)
  const burialDate = toIsoDate(deceased.burialDate)

  return {
    id: deceased.id,
    internalCode: deceased.internalCode,
    fullName: deceased.fullName,
    historicalDataIncomplete: deceased.historicalDataIncomplete,
    createdAt: toIsoDateTime(deceased.createdAt),
    ...(documentMasked ? { documentMasked } : {}),
    ...(deathDate ? { deathDate } : {}),
    ...(burialDate ? { burialDate } : {}),
  }
}

export function toBurialByPeriodReportItemDto(
  link: BurialByPeriodReportItemSource,
): BurialByPeriodReportItemDto {
  const deceasedDocumentMasked = toMaskedDocument(
    link.deceased.document,
  )
  const burialDate = toIsoDate(link.burialDate)

  return {
    burialLinkId: link.id,
    linkStatus: link.status,
    deceasedId: link.deceased.id,
    internalCode: link.deceased.internalCode,
    deceasedName: link.deceased.fullName,
    burialSpaceId: link.burialSpace.id,
    burialSpaceType: link.burialSpace.type,
    burialSpaceIdentifier: link.burialSpace.identifier,
    burialSpaceStatus: link.burialSpace.status,
    locationDescription: formatLocation(link.burialSpace),
    ...(burialDate ? { burialDate } : {}),
    ...(deceasedDocumentMasked
      ? { deceasedDocumentMasked }
      : {}),
  }
}

export function toSpaceOccupationReportItemDto(
  space: SpaceReportItemSource,
): SpaceOccupationReportItemDto {
  return {
    burialSpaceId: space.id,
    burialSpaceType: space.type,
    identifier: space.identifier,
    locationDescription: formatLocation(space),
    status: space.status,
    capacity: space.capacity,
    activeLinkCount: space.activeLinkCount,
    availableCapacity: Math.max(
      space.capacity - space.activeLinkCount,
      0,
    ),
  }
}

export function toSpaceStatusReportItemDto(
  space: SpaceReportItemSource,
): SpaceStatusReportItemDto {
  return {
    burialSpaceId: space.id,
    burialSpaceType: space.type,
    identifier: space.identifier,
    locationDescription: formatLocation(space),
    status: space.status,
    capacity: space.capacity,
    activeLinkCount: space.activeLinkCount,
  }
}

export function toPaginatedReportDto<
  TItem,
  TFilters extends object,
>(
  report: PaginatedReportSource<TItem, TFilters>,
): PaginatedReportDto<TItem, TFilters> {
  const emptyMessage =
    report.items.length === 0 ? report.emptyMessage?.trim() : undefined

  return {
    title: report.title,
    generatedAt: toIsoDateTime(report.generatedAt),
    filters: report.filters,
    data: report.items,
    ...report.pagination,
    ...(emptyMessage ? { emptyMessage } : {}),
  }
}
