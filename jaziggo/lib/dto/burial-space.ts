import "server-only"

import type {
  BurialSpaceListItemDto,
  BurialSpaceStatus,
  BurialSpaceType,
} from "../../types/burial-space"

interface BurialSpaceDtoSource {
  id: string
  type: BurialSpaceType
  identifier: string
  sector: string | null
  block: string | null
  street: string | null
  row: string | null
  number: string | null
  complement: string | null
  status: BurialSpaceStatus
  capacity: number
  activeLinkCount: number
}

export function toBurialSpaceDto(
  space: BurialSpaceDtoSource,
): BurialSpaceListItemDto {
  return {
    id: space.id,
    type: space.type,
    identifier: space.identifier,
    ...(space.sector === null ? {} : { sector: space.sector }),
    ...(space.block === null ? {} : { block: space.block }),
    ...(space.street === null ? {} : { street: space.street }),
    ...(space.row === null ? {} : { row: space.row }),
    ...(space.number === null ? {} : { number: space.number }),
    ...(space.complement === null
      ? {}
      : { complement: space.complement }),
    status: space.status,
    capacity: space.capacity,
    activeLinkCount: space.activeLinkCount,
  }
}
