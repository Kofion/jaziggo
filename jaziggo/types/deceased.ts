import type { PaginationParams } from "./api"

export type IsoDateString = string
export type IsoDateTimeString = string

interface DeceasedInputFields {
  fullName: string
  document?: string
  birthDate?: IsoDateString
  notes?: string
}

type KnownDeceasedDates =
  | {
      deathDate: IsoDateString
      burialDate?: IsoDateString
      datesUnknown?: false
    }
  | {
      deathDate?: IsoDateString
      burialDate: IsoDateString
      datesUnknown?: false
    }

type UnknownDeceasedDates = {
  deathDate?: never
  burialDate?: never
  datesUnknown: true
}

export type CreateDeceasedInput = DeceasedInputFields &
  (KnownDeceasedDates | UnknownDeceasedDates)

export type UpdateDeceasedInput = CreateDeceasedInput

export interface DeceasedListItemDto {
  id: string
  internalCode: string
  fullName: string
  documentMasked?: string
  deathDate?: IsoDateString
  burialDate?: IsoDateString
  historicalDataIncomplete: boolean
}

export interface DeceasedDetailDto extends DeceasedListItemDto {
  birthDate?: IsoDateString
  datesUnknown: boolean
  notes?: string
  createdAt?: IsoDateTimeString
  updatedAt?: IsoDateTimeString
}

export interface DeceasedDuplicateCandidateDto {
  id: string
  internalCode: string
  fullName: string
  documentMasked?: string
  birthDate?: IsoDateString
  deathDate?: IsoDateString
  burialDate?: IsoDateString
  historicalDataIncomplete: boolean
}

export interface DeceasedListFilters extends PaginationParams {
  name?: string
  internalCode?: string
  deathDate?: IsoDateString
  burialDate?: IsoDateString
}

export interface DeceasedExactDocumentFilter extends PaginationParams {
  document: string
}
