import type {
  ActiveBurialLink,
  BurialLink,
  CreateActiveBurialLinkCommand,
  EndBurialLinkCommand,
  EndedBurialLink,
} from "../../types/burial-link"
import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceListItemDto,
} from "../../types/burial-space"
import {
  availableSepulturaFixture,
  occupiedJazigoFixture,
  occupiedSepulturaFixture,
} from "./burial-spaces"
import {
  burialDateOnlyDeceasedFixture,
  completeDeceasedFixture,
  deathDateOnlyDeceasedFixture,
  homonymDeceasedFixture,
  homonymDeceasedWithDifferentDatesFixture,
  sameNameAndDeathDateDuplicateFixture,
} from "./deceased"
import { homonymResponsibleFixture } from "./responsibles"

export interface BurialLinkRecalculationFixture {
  initialSpace: BurialSpaceListItemDto
  initialActiveLinks: readonly ActiveBurialLink[]
  endCommand: EndBurialLinkCommand
  expectedSpaceStatus: BurialSpaceListItemDto["status"]
  expectedActiveLinkCount: number
}

export interface BurialLinkConcurrencyFixture {
  initialSpace: BurialSpaceListItemDto
  existingActiveLinks: readonly ActiveBurialLink[]
  contenderCommands: readonly CreateActiveBurialLinkCommand[]
  expectedSuccessCount: number
  expectedActiveLinkCount: number
}

export const endedHistoricalBurialLinkFixture = {
  id: "00000000-0000-4000-8000-000000007001",
  deceasedId: completeDeceasedFixture.id,
  burialSpaceId: availableSepulturaFixture.id,
  burialDate: completeDeceasedFixture.burialDate,
  status: "ENDED",
  endedAt: "2025-08-20T12:00:00.000Z",
  endReason: "Historical transfer to another burial space",
  createdAt: "2025-02-12T12:00:00.000Z",
  updatedAt: "2025-08-20T12:00:00.000Z",
} as const satisfies EndedBurialLink

export const activeSepulturaBurialLinkFixture = {
  id: "00000000-0000-4000-8000-000000007002",
  deceasedId: completeDeceasedFixture.id,
  burialSpaceId: occupiedSepulturaFixture.id,
  responsibleId: homonymResponsibleFixture.id,
  burialDate: "2025-08-21",
  status: "ACTIVE",
  endedAt: null,
  endReason: null,
  createdAt: "2025-08-21T12:00:00.000Z",
  updatedAt: "2025-08-21T12:00:00.000Z",
} as const satisfies ActiveBurialLink

export const firstAtCapacityJazigoBurialLinkFixture = {
  id: "00000000-0000-4000-8000-000000007003",
  deceasedId: deathDateOnlyDeceasedFixture.id,
  burialSpaceId: occupiedJazigoFixture.id,
  burialDate: "2025-01-10",
  status: "ACTIVE",
  endedAt: null,
  endReason: null,
  createdAt: "2025-01-10T12:00:00.000Z",
  updatedAt: "2025-01-10T12:00:00.000Z",
} as const satisfies ActiveBurialLink

export const secondAtCapacityJazigoBurialLinkFixture = {
  id: "00000000-0000-4000-8000-000000007004",
  deceasedId: burialDateOnlyDeceasedFixture.id,
  burialSpaceId: occupiedJazigoFixture.id,
  responsibleId: homonymResponsibleFixture.id,
  burialDate: burialDateOnlyDeceasedFixture.burialDate,
  status: "ACTIVE",
  endedAt: null,
  endReason: null,
  createdAt: "2025-02-10T12:00:00.000Z",
  updatedAt: "2025-02-10T12:00:00.000Z",
} as const satisfies ActiveBurialLink

export const atCapacityJazigoBurialLinksFixture = [
  firstAtCapacityJazigoBurialLinkFixture,
  secondAtCapacityJazigoBurialLinkFixture,
] as const satisfies readonly ActiveBurialLink[]

export const lastSlotJazigoFixture = {
  id: "00000000-0000-4000-8000-000000002005",
  type: BURIAL_SPACE_TYPE.JAZIGO,
  identifier: "JAZ-FIXTURE-LAST-SLOT",
  sector: "Fixture Sector B",
  row: "B5",
  number: "5",
  status: BURIAL_SPACE_STATUS.OCCUPIED,
  capacity: 2,
  activeLinkCount: 1,
} as const satisfies BurialSpaceListItemDto

export const existingLastSlotJazigoBurialLinkFixture = {
  id: "00000000-0000-4000-8000-000000007005",
  deceasedId: homonymDeceasedFixture.id,
  burialSpaceId: lastSlotJazigoFixture.id,
  burialDate: homonymDeceasedFixture.burialDate,
  status: "ACTIVE",
  endedAt: null,
  endReason: null,
  createdAt: "2025-03-10T12:00:00.000Z",
  updatedAt: "2025-03-10T12:00:00.000Z",
} as const satisfies ActiveBurialLink

export const firstLastSlotContenderCommandFixture = {
  deceasedId: homonymDeceasedWithDifferentDatesFixture.id,
  burialSpaceId: lastSlotJazigoFixture.id,
  confirmation: true,
} as const satisfies CreateActiveBurialLinkCommand

export const secondLastSlotContenderCommandFixture = {
  deceasedId: sameNameAndDeathDateDuplicateFixture.id,
  burialSpaceId: lastSlotJazigoFixture.id,
  confirmation: true,
} as const satisfies CreateActiveBurialLinkCommand

export const lastSlotConcurrencyFixture = {
  initialSpace: lastSlotJazigoFixture,
  existingActiveLinks: [
    existingLastSlotJazigoBurialLinkFixture,
  ],
  contenderCommands: [
    firstLastSlotContenderCommandFixture,
    secondLastSlotContenderCommandFixture,
  ],
  expectedSuccessCount: 1,
  expectedActiveLinkCount: lastSlotJazigoFixture.capacity,
} as const satisfies BurialLinkConcurrencyFixture

export const endActiveSepulturaBurialLinkCommandFixture = {
  burialLinkId: activeSepulturaBurialLinkFixture.id,
  endedAt: "2026-01-15T12:00:00.000Z",
  endReason: "Confirmed historical closure",
  confirmation: true,
} as const satisfies EndBurialLinkCommand

export const endAtCapacityJazigoBurialLinkCommandFixture = {
  burialLinkId: secondAtCapacityJazigoBurialLinkFixture.id,
  endedAt: "2026-02-15T12:00:00.000Z",
  endReason: "Confirmed transfer while another active link remains",
  confirmation: true,
} as const satisfies EndBurialLinkCommand

export const recalculateToAvailableFixture = {
  initialSpace: occupiedSepulturaFixture,
  initialActiveLinks: [activeSepulturaBurialLinkFixture],
  endCommand: endActiveSepulturaBurialLinkCommandFixture,
  expectedSpaceStatus: BURIAL_SPACE_STATUS.AVAILABLE,
  expectedActiveLinkCount: 0,
} as const satisfies BurialLinkRecalculationFixture

export const recalculateToOccupiedFixture = {
  initialSpace: occupiedJazigoFixture,
  initialActiveLinks: atCapacityJazigoBurialLinksFixture,
  endCommand: endAtCapacityJazigoBurialLinkCommandFixture,
  expectedSpaceStatus: BURIAL_SPACE_STATUS.OCCUPIED,
  expectedActiveLinkCount: 1,
} as const satisfies BurialLinkRecalculationFixture

export const completeDeceasedBurialHistoryFixture = [
  activeSepulturaBurialLinkFixture,
  endedHistoricalBurialLinkFixture,
] as const satisfies readonly BurialLink[]

export const burialLinkFixtures = [
  endedHistoricalBurialLinkFixture,
  activeSepulturaBurialLinkFixture,
  ...atCapacityJazigoBurialLinksFixture,
  existingLastSlotJazigoBurialLinkFixture,
] as const satisfies readonly BurialLink[]
