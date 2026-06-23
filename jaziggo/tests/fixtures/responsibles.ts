import {
  LINK_STATUS,
  RESPONSIBLE_LINK_TYPE,
  type CreateResponsibleInput,
  type CreateResponsibleLinkCommand,
  type EndResponsibleLinkCommand,
  type ResponsibleDetailDto,
  type ResponsibleLinkDto,
  type ResponsibleListItemDto,
} from "../../types/responsible"
import { availableJazigoFixture } from "./burial-spaces"

type ResponsiblePersistenceFixture = CreateResponsibleInput & {
  id: string
  searchName: string
}

export const deceasedResponsibleTargetIdFixture =
  "00000000-0000-4000-8000-000000003001" as const

export const historicalDeceasedResponsibleTargetIdFixture =
  "00000000-0000-4000-8000-000000003002" as const

export const documentOnlyResponsibleFixture = {
  id: "00000000-0000-4000-8000-000000004001",
  fullName: "Responsible Document Only",
  searchName: "responsible document only",
  document: "11122233344",
} as const satisfies ResponsiblePersistenceFixture

export const phoneOnlyResponsibleFixture = {
  id: "00000000-0000-4000-8000-000000004002",
  fullName: "Responsible Phone Only",
  searchName: "responsible phone only",
  phone: "11988887777",
} as const satisfies ResponsiblePersistenceFixture

export const emailOnlyResponsibleFixture = {
  id: "00000000-0000-4000-8000-000000004003",
  fullName: "Responsible Email Only",
  searchName: "responsible email only",
  email: "responsible.email@jaziggo.test",
} as const satisfies ResponsiblePersistenceFixture

export const addressOnlyResponsibleFixture = {
  id: "00000000-0000-4000-8000-000000004004",
  fullName: "Responsible Address Only",
  searchName: "responsible address only",
  address: "Test administrative address",
} as const satisfies ResponsiblePersistenceFixture

export const homonymResponsibleFixture = {
  id: "00000000-0000-4000-8000-000000004005",
  fullName: "Alex Responsible",
  searchName: "alex responsible",
  document: "22233344455",
  phone: "21977776666",
  email: "alex.one@jaziggo.test",
  address: "Homonym address one",
} as const satisfies ResponsiblePersistenceFixture

export const homonymResponsibleWithDifferentContactFixture = {
  id: "00000000-0000-4000-8000-000000004006",
  fullName: "Alex Responsible",
  searchName: "alex responsible",
  document: "33344455566",
  phone: "31966665555",
  email: "alex.two@jaziggo.test",
  address: "Homonym address two",
} as const satisfies ResponsiblePersistenceFixture

export const activeDeceasedResponsibleLinkFixture = {
  id: "00000000-0000-4000-8000-000000005001",
  responsibleId: homonymResponsibleFixture.id,
  linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
  deceasedId: deceasedResponsibleTargetIdFixture,
  status: LINK_STATUS.ACTIVE,
  createdAt: "2026-01-10T12:00:00.000Z",
} as const satisfies ResponsibleLinkDto

export const endedBurialSpaceResponsibleLinkFixture = {
  id: "00000000-0000-4000-8000-000000005002",
  responsibleId: homonymResponsibleFixture.id,
  linkType: RESPONSIBLE_LINK_TYPE.BURIAL_SPACE,
  burialSpaceId: availableJazigoFixture.id,
  status: LINK_STATUS.ENDED,
  endedAt: "2026-02-15T12:00:00.000Z",
  endReason: "Administrative responsibility transferred",
  createdAt: "2026-01-05T12:00:00.000Z",
} as const satisfies ResponsibleLinkDto

export const endedDeceasedResponsibleLinkFixture = {
  id: "00000000-0000-4000-8000-000000005003",
  responsibleId: homonymResponsibleWithDifferentContactFixture.id,
  linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
  deceasedId: historicalDeceasedResponsibleTargetIdFixture,
  status: LINK_STATUS.ENDED,
  endedAt: "2026-03-20T12:00:00.000Z",
  endReason: "Historical administrative link closed",
  createdAt: "2026-01-20T12:00:00.000Z",
} as const satisfies ResponsibleLinkDto

export const documentOnlyResponsibleListFixture = {
  id: documentOnlyResponsibleFixture.id,
  fullName: documentOnlyResponsibleFixture.fullName,
  documentMasked: "*******3344",
} as const satisfies ResponsibleListItemDto

export const phoneOnlyResponsibleListFixture = {
  id: phoneOnlyResponsibleFixture.id,
  fullName: phoneOnlyResponsibleFixture.fullName,
} as const satisfies ResponsibleListItemDto

export const homonymResponsibleListFixture = {
  id: homonymResponsibleFixture.id,
  fullName: homonymResponsibleFixture.fullName,
  documentMasked: "*******4455",
} as const satisfies ResponsibleListItemDto

export const homonymResponsibleWithDifferentContactListFixture = {
  id: homonymResponsibleWithDifferentContactFixture.id,
  fullName: homonymResponsibleWithDifferentContactFixture.fullName,
  documentMasked: "*******5566",
} as const satisfies ResponsibleListItemDto

export const responsibleDetailWithHistoricalCycleFixture = {
  id: homonymResponsibleFixture.id,
  fullName: homonymResponsibleFixture.fullName,
  documentMasked: homonymResponsibleListFixture.documentMasked,
  phone: homonymResponsibleFixture.phone,
  email: homonymResponsibleFixture.email,
  address: homonymResponsibleFixture.address,
  links: [
    activeDeceasedResponsibleLinkFixture,
    endedBurialSpaceResponsibleLinkFixture,
  ],
} as const satisfies ResponsibleDetailDto

export const createActiveResponsibleLinkCommandFixture = {
  responsibleId: homonymResponsibleFixture.id,
  linkType: RESPONSIBLE_LINK_TYPE.DECEASED,
  deceasedId: deceasedResponsibleTargetIdFixture,
} as const satisfies CreateResponsibleLinkCommand

export const endResponsibleLinkCommandFixture = {
  responsibleLinkId: activeDeceasedResponsibleLinkFixture.id,
  endedAt: "2026-04-10T12:00:00.000Z",
  endReason: "Confirmed administrative closure",
  confirmation: true,
} as const satisfies EndResponsibleLinkCommand

export const responsibleFixtures = [
  documentOnlyResponsibleFixture,
  phoneOnlyResponsibleFixture,
  emailOnlyResponsibleFixture,
  addressOnlyResponsibleFixture,
  homonymResponsibleFixture,
  homonymResponsibleWithDifferentContactFixture,
] as const

export const responsibleListFixtures = [
  documentOnlyResponsibleListFixture,
  phoneOnlyResponsibleListFixture,
  homonymResponsibleListFixture,
  homonymResponsibleWithDifferentContactListFixture,
] as const

export const responsibleLinkFixtures = [
  activeDeceasedResponsibleLinkFixture,
  endedBurialSpaceResponsibleLinkFixture,
  endedDeceasedResponsibleLinkFixture,
] as const
