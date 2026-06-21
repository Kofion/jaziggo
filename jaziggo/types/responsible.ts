import type { PaginationParams } from "./api"

interface ResponsibleContactFields {
  document?: string
  phone?: string
  email?: string
  address?: string
}

type ResponsibleContactField = keyof ResponsibleContactFields

type RequiredResponsibleContact = ResponsibleContactFields &
  {
    [Field in ResponsibleContactField]: Required<
      Pick<ResponsibleContactFields, Field>
    >
  }[ResponsibleContactField]

export type CreateResponsibleInput = RequiredResponsibleContact & {
  fullName: string
}

export type UpdateResponsibleInput = CreateResponsibleInput

export interface ResponsibleListItemDto {
  id: string
  fullName: string
  documentMasked?: string
}

export interface ResponsibleDetailDto extends ResponsibleListItemDto {
  phone?: string
  email?: string
  address?: string
  links: ResponsibleLinkDto[]
  createdAt?: string
  updatedAt?: string
}

export interface ResponsibleListFilters extends PaginationParams {
  name?: string
}

export type ResponsibleSensitiveSearchFilters = PaginationParams &
  (
    | { document: string; phone?: never }
    | { document?: never; phone: string }
  )

export const RESPONSIBLE_LINK_TYPE = {
  DECEASED: "DECEASED",
  BURIAL_SPACE: "BURIAL_SPACE",
} as const

export type ResponsibleLinkType =
  (typeof RESPONSIBLE_LINK_TYPE)[keyof typeof RESPONSIBLE_LINK_TYPE]

export const LINK_STATUS = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const

export type LinkStatus = (typeof LINK_STATUS)[keyof typeof LINK_STATUS]

type DeceasedResponsibleLinkTarget = {
  linkType: "DECEASED"
  deceasedId: string
  burialSpaceId?: never
}

type BurialSpaceResponsibleLinkTarget = {
  linkType: "BURIAL_SPACE"
  burialSpaceId: string
  deceasedId?: never
}

export type ResponsibleLinkTarget =
  | DeceasedResponsibleLinkTarget
  | BurialSpaceResponsibleLinkTarget

type ActiveResponsibleLink = {
  status: "ACTIVE"
  endedAt?: never
  endReason?: never
}

type EndedResponsibleLink = {
  status: "ENDED"
  endedAt: string
  endReason: string
}

export type ResponsibleLinkDto = ResponsibleLinkTarget &
  (ActiveResponsibleLink | EndedResponsibleLink) & {
    id: string
    responsibleId: string
    createdAt: string
    updatedAt?: string
  }

export type CreateResponsibleLinkCommand = ResponsibleLinkTarget & {
  responsibleId: string
}

export interface EndResponsibleLinkCommand {
  responsibleLinkId: string
  endedAt: string
  endReason: string
  confirmation: true
}
