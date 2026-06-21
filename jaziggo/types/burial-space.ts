import type { PaginationParams } from "./api"

export const BURIAL_SPACE_TYPE = {
  SEPULTURA: "SEPULTURA",
  JAZIGO: "JAZIGO",
} as const

export type BurialSpaceType =
  (typeof BURIAL_SPACE_TYPE)[keyof typeof BURIAL_SPACE_TYPE]

export const BURIAL_SPACE_STATUS = {
  AVAILABLE: "AVAILABLE",
  OCCUPIED: "OCCUPIED",
  RESERVED: "RESERVED",
  INACTIVE: "INACTIVE",
} as const

export type BurialSpaceStatus =
  (typeof BURIAL_SPACE_STATUS)[keyof typeof BURIAL_SPACE_STATUS]

export type InitialBurialSpaceStatus = Exclude<
  BurialSpaceStatus,
  "OCCUPIED"
>

export interface BurialSpaceLocation {
  sector?: string
  block?: string
  street?: string
  row?: string
  number?: string
  complement?: string
}

type BurialSpaceLocationField = keyof BurialSpaceLocation

export type RequiredBurialSpaceLocation = BurialSpaceLocation &
  {
    [Field in BurialSpaceLocationField]: Required<
      Pick<BurialSpaceLocation, Field>
    >
  }[BurialSpaceLocationField]

interface BurialSpaceInputFields {
  identifier: string
}

type SepulturaInput = {
  type: "SEPULTURA"
  capacity: 1
}

type JazigoInput = {
  type: "JAZIGO"
  capacity: number
}

export type CreateBurialSpaceInput = BurialSpaceInputFields &
  RequiredBurialSpaceLocation &
  (SepulturaInput | JazigoInput) & {
    status: InitialBurialSpaceStatus
  }

export type UpdateBurialSpaceInput = BurialSpaceInputFields &
  RequiredBurialSpaceLocation &
  (SepulturaInput | JazigoInput)

export interface BurialSpaceListItemDto extends BurialSpaceLocation {
  id: string
  type: BurialSpaceType
  identifier: string
  status: BurialSpaceStatus
  capacity: number
  activeLinkCount: number
}

export interface BurialSpaceDetailDto extends BurialSpaceListItemDto {
  locationKey: string
  createdAt?: string
  updatedAt?: string
}

export interface BurialSpaceListFilters
  extends PaginationParams,
    BurialSpaceLocation {
  identifier?: string
  type?: BurialSpaceType
  status?: BurialSpaceStatus
}
