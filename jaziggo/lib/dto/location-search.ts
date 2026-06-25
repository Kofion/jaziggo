import "server-only"

import type {
  BurialSpaceStatus,
  BurialSpaceType,
} from "../../types/burial-space"
import type { IsoDateString } from "../../types/deceased"
import { maskDocument } from "../privacy/mask-document"

type DateLike = Date | string

interface LocationSearchItemDtoSource {
  deceasedId: string
  internalCode: string
  deceasedName: string
  deceasedDocument: string | null
  deathDate: DateLike | null
  burialDate: DateLike | null
  historicalDataIncomplete: boolean
  responsibleName: string | null
  responsibleDocument: string | null
  burialSpaceId: string
  burialSpaceType: BurialSpaceType
  locationDescription: string
  status: BurialSpaceStatus
}

export interface LocationSearchItemDto {
  deceasedId: string
  internalCode: string
  deceasedName: string
  deceasedDocumentMasked?: string
  deathDate?: IsoDateString
  burialDate?: IsoDateString
  historicalDataIncomplete: boolean
  responsibleName?: string
  responsibleDocumentMasked?: string
  burialSpaceId: string
  burialSpaceType: BurialSpaceType
  locationDescription: string
  status: BurialSpaceStatus
}

function toIsoDate(
  value: DateLike | null,
): IsoDateString | undefined {
  if (!value) {
    return undefined
  }

  return (value instanceof Date ? value.toISOString() : value).slice(
    0,
    10,
  )
}

export function toLocationSearchItemDto(
  item: LocationSearchItemDtoSource,
): LocationSearchItemDto {
  const deceasedDocumentMasked =
    maskDocument(item.deceasedDocument) || undefined
  const responsibleDocumentMasked =
    maskDocument(item.responsibleDocument) || undefined
  const deathDate = toIsoDate(item.deathDate)
  const burialDate = toIsoDate(item.burialDate)

  return {
    deceasedId: item.deceasedId,
    internalCode: item.internalCode,
    deceasedName: item.deceasedName,
    historicalDataIncomplete: item.historicalDataIncomplete,
    burialSpaceId: item.burialSpaceId,
    burialSpaceType: item.burialSpaceType,
    locationDescription: item.locationDescription,
    status: item.status,
    ...(deceasedDocumentMasked
      ? { deceasedDocumentMasked }
      : {}),
    ...(deathDate ? { deathDate } : {}),
    ...(burialDate ? { burialDate } : {}),
    ...(item.responsibleName
      ? { responsibleName: item.responsibleName }
      : {}),
    ...(responsibleDocumentMasked
      ? { responsibleDocumentMasked }
      : {}),
  }
}
