import "server-only"

import type {
  DeceasedDetailDto,
  DeceasedDuplicateCandidateDto,
  DeceasedListItemDto,
  IsoDateString,
  IsoDateTimeString,
} from "../../types/deceased"
import { maskDocument } from "../privacy/mask"

type DateLike = Date | string

interface DeceasedListDtoSource {
  id: string
  internalCode: string
  fullName: string
  document: string | null
  deathDate: DateLike | null
  burialDate: DateLike | null
  historicalDataIncomplete: boolean
}

interface DeceasedDetailDtoSource extends DeceasedListDtoSource {
  birthDate: DateLike | null
  datesUnknown: boolean
  notes: string | null
  createdAt?: DateLike | null
  updatedAt?: DateLike | null
}

interface DeceasedDuplicateCandidateDtoSource extends DeceasedListDtoSource {
  birthDate: DateLike | null
}

function toIsoDateString(value: DateLike | null | undefined): IsoDateString | undefined {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return value.slice(0, 10)
}

function toIsoDateTimeString(value: DateLike | null | undefined): IsoDateTimeString | undefined {
  if (!value) {
    return undefined
  }

  return value instanceof Date ? value.toISOString() : value
}

export function toDeceasedListItemDto(deceased: DeceasedListDtoSource): DeceasedListItemDto {
  const documentMasked = maskDocument(deceased.document) || undefined
  const deathDate = toIsoDateString(deceased.deathDate)
  const burialDate = toIsoDateString(deceased.burialDate)

  return {
    id: deceased.id,
    internalCode: deceased.internalCode,
    fullName: deceased.fullName,
    historicalDataIncomplete: deceased.historicalDataIncomplete,
    ...(documentMasked ? { documentMasked } : {}),
    ...(deathDate ? { deathDate } : {}),
    ...(burialDate ? { burialDate } : {}),
  }
}

export function toDeceasedDetailDto(deceased: DeceasedDetailDtoSource): DeceasedDetailDto {
  const birthDate = toIsoDateString(deceased.birthDate)
  const createdAt = toIsoDateTimeString(deceased.createdAt)
  const updatedAt = toIsoDateTimeString(deceased.updatedAt)

  return {
    ...toDeceasedListItemDto(deceased),
    datesUnknown: deceased.datesUnknown,
    ...(birthDate ? { birthDate } : {}),
    ...(deceased.notes !== null ? { notes: deceased.notes } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  }
}

export function toDeceasedDuplicateCandidateDto(
  deceased: DeceasedDuplicateCandidateDtoSource,
): DeceasedDuplicateCandidateDto {
  const birthDate = toIsoDateString(deceased.birthDate)

  return {
    ...toDeceasedListItemDto(deceased),
    ...(birthDate ? { birthDate } : {}),
  }
}
