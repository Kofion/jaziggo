import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceListItemDto,
} from "../../types/burial-space"

export const availableSepulturaFixture = {
  id: "00000000-0000-4000-8000-000000001001",
  type: BURIAL_SPACE_TYPE.SEPULTURA,
  identifier: "SEP-FIXTURE-AVAILABLE",
  sector: "Fixture Sector A",
  row: "A1",
  number: "1",
  status: BURIAL_SPACE_STATUS.AVAILABLE,
  capacity: 1,
  activeLinkCount: 0,
} as const satisfies BurialSpaceListItemDto

export const occupiedSepulturaFixture = {
  id: "00000000-0000-4000-8000-000000001002",
  type: BURIAL_SPACE_TYPE.SEPULTURA,
  identifier: "SEP-FIXTURE-OCCUPIED",
  sector: "Fixture Sector A",
  row: "A2",
  number: "2",
  status: BURIAL_SPACE_STATUS.OCCUPIED,
  capacity: 1,
  activeLinkCount: 1,
} as const satisfies BurialSpaceListItemDto

export const reservedSepulturaFixture = {
  id: "00000000-0000-4000-8000-000000001003",
  type: BURIAL_SPACE_TYPE.SEPULTURA,
  identifier: "SEP-FIXTURE-RESERVED",
  sector: "Fixture Sector A",
  row: "A3",
  number: "3",
  status: BURIAL_SPACE_STATUS.RESERVED,
  capacity: 1,
  activeLinkCount: 0,
} as const satisfies BurialSpaceListItemDto

export const inactiveSepulturaFixture = {
  id: "00000000-0000-4000-8000-000000001004",
  type: BURIAL_SPACE_TYPE.SEPULTURA,
  identifier: "SEP-FIXTURE-INACTIVE",
  sector: "Fixture Sector A",
  row: "A4",
  number: "4",
  status: BURIAL_SPACE_STATUS.INACTIVE,
  capacity: 1,
  activeLinkCount: 0,
} as const satisfies BurialSpaceListItemDto

export const availableJazigoFixture = {
  id: "00000000-0000-4000-8000-000000002001",
  type: BURIAL_SPACE_TYPE.JAZIGO,
  identifier: "JAZ-FIXTURE-AVAILABLE",
  sector: "Fixture Sector B",
  row: "B1",
  number: "1",
  status: BURIAL_SPACE_STATUS.AVAILABLE,
  capacity: 2,
  activeLinkCount: 0,
} as const satisfies BurialSpaceListItemDto

export const occupiedJazigoFixture = {
  id: "00000000-0000-4000-8000-000000002002",
  type: BURIAL_SPACE_TYPE.JAZIGO,
  identifier: "JAZ-FIXTURE-OCCUPIED",
  sector: "Fixture Sector B",
  row: "B2",
  number: "2",
  status: BURIAL_SPACE_STATUS.OCCUPIED,
  capacity: 2,
  activeLinkCount: 2,
} as const satisfies BurialSpaceListItemDto

export const reservedJazigoFixture = {
  id: "00000000-0000-4000-8000-000000002003",
  type: BURIAL_SPACE_TYPE.JAZIGO,
  identifier: "JAZ-FIXTURE-RESERVED",
  sector: "Fixture Sector B",
  row: "B3",
  number: "3",
  status: BURIAL_SPACE_STATUS.RESERVED,
  capacity: 2,
  activeLinkCount: 0,
} as const satisfies BurialSpaceListItemDto

export const inactiveJazigoFixture = {
  id: "00000000-0000-4000-8000-000000002004",
  type: BURIAL_SPACE_TYPE.JAZIGO,
  identifier: "JAZ-FIXTURE-INACTIVE",
  sector: "Fixture Sector B",
  row: "B4",
  number: "4",
  status: BURIAL_SPACE_STATUS.INACTIVE,
  capacity: 2,
  activeLinkCount: 0,
} as const satisfies BurialSpaceListItemDto

export const burialSpaceFixtures = [
  availableSepulturaFixture,
  occupiedSepulturaFixture,
  reservedSepulturaFixture,
  inactiveSepulturaFixture,
  availableJazigoFixture,
  occupiedJazigoFixture,
  reservedJazigoFixture,
  inactiveJazigoFixture,
] as const
