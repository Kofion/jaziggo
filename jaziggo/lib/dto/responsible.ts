import "server-only"

import { maskDocument } from "../privacy/mask"
import type {
  ResponsibleDetailDto,
  ResponsibleLinkDto,
  ResponsibleListItemDto,
} from "../../types/responsible"

interface ResponsibleListDtoSource {
  id: string
  fullName: string
  document: string | null
}

interface ResponsibleDetailDtoSource
  extends ResponsibleListDtoSource {
  phone: string | null
  email: string | null
  address: string | null
  links: readonly ResponsibleLinkDto[]
}

export function toResponsibleListItemDto(
  responsible: ResponsibleListDtoSource,
): ResponsibleListItemDto {
  const documentMasked = maskDocument(responsible.document)

  return {
    id: responsible.id,
    fullName: responsible.fullName,
    ...(documentMasked ? { documentMasked } : {}),
  }
}

export function toResponsibleDetailDto(
  responsible: ResponsibleDetailDtoSource,
): ResponsibleDetailDto {
  return {
    ...toResponsibleListItemDto(responsible),
    ...(responsible.phone === null
      ? {}
      : { phone: responsible.phone }),
    ...(responsible.email === null
      ? {}
      : { email: responsible.email }),
    ...(responsible.address === null
      ? {}
      : { address: responsible.address }),
    links: [...responsible.links],
  }
}
