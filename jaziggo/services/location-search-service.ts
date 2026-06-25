import "server-only"

import type { Prisma } from "@prisma/client"

import { requirePermission } from "../lib/auth/permissions"
import { prisma } from "../lib/db/prisma"
import {
  toLocationSearchItemDto,
  type LocationSearchItemDto,
} from "../lib/dto/location-search"
import { formatLocation } from "../lib/location/format-location"
import { uuidSchema } from "../lib/validation/common"
import {
  locationDocumentSearchSchema,
  locationSearchFiltersSchema,
  type LocationDocumentSearchInput,
  type LocationSearchFiltersInput,
} from "../lib/validation/search"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type PaginatedData,
} from "../types/api"
import { PERMISSION } from "../types/auth"

const LOCATION_SEARCH_SELECT = {
  id: true,
  burialDate: true,
  deceased: {
    select: {
      id: true,
      internalCode: true,
      fullName: true,
      document: true,
      deathDate: true,
      burialDate: true,
      historicalDataIncomplete: true,
    },
  },
  burialSpace: {
    select: {
      id: true,
      type: true,
      sector: true,
      block: true,
      street: true,
      row: true,
      number: true,
      complement: true,
      status: true,
    },
  },
  responsible: {
    select: {
      fullName: true,
      document: true,
    },
  },
} as const satisfies Prisma.BurialLinkSelect

type LocationSearchRecord = Prisma.BurialLinkGetPayload<{
  select: typeof LOCATION_SEARCH_SELECT
}>

type LocationSearchServiceErrorCode =
  | typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR
  | typeof DOMAIN_ERROR_CODE.NOT_FOUND

type LocationSearchServiceErrorStatus =
  | typeof HTTP_STATUS.UNPROCESSABLE_ENTITY
  | typeof HTTP_STATUS.NOT_FOUND

export class LocationSearchServiceError extends Error {
  readonly code: LocationSearchServiceErrorCode
  readonly status: LocationSearchServiceErrorStatus

  private constructor(
    code: LocationSearchServiceErrorCode,
    status: LocationSearchServiceErrorStatus,
    message: string,
  ) {
    super(message)
    this.name = "LocationSearchServiceError"
    this.code = code
    this.status = status
  }

  static validation(): LocationSearchServiceError {
    return new LocationSearchServiceError(
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "Invalid location search filters",
    )
  }

  static notFound(): LocationSearchServiceError {
    return new LocationSearchServiceError(
      DOMAIN_ERROR_CODE.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      "Location not found",
    )
  }
}

function toDateFilter(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function locationKeyFilter(
  key: string,
  value: string,
): Prisma.BurialSpaceWhereInput {
  const token = `${key}=${encodeURIComponent(value)}`

  return {
    OR: [
      { locationKey: { contains: `${token}|` } },
      { locationKey: { endsWith: token } },
    ],
  }
}

function toLocationSearchDto(
  link: LocationSearchRecord,
): LocationSearchItemDto {
  return toLocationSearchItemDto({
    deceasedId: link.deceased.id,
    internalCode: link.deceased.internalCode,
    deceasedName: link.deceased.fullName,
    deceasedDocument: link.deceased.document,
    deathDate: link.deceased.deathDate,
    burialDate: link.deceased.burialDate ?? link.burialDate,
    historicalDataIncomplete:
      link.deceased.historicalDataIncomplete,
    responsibleName: link.responsible?.fullName ?? null,
    responsibleDocument: link.responsible?.document ?? null,
    burialSpaceId: link.burialSpace.id,
    burialSpaceType: link.burialSpace.type,
    locationDescription: formatLocation({
      sector: link.burialSpace.sector ?? undefined,
      block: link.burialSpace.block ?? undefined,
      street: link.burialSpace.street ?? undefined,
      row: link.burialSpace.row ?? undefined,
      number: link.burialSpace.number ?? undefined,
      complement: link.burialSpace.complement ?? undefined,
    }),
    status: link.burialSpace.status,
  })
}

async function findLocationPage(
  where: Prisma.BurialLinkWhereInput,
  page: number,
  pageSize: number,
): Promise<PaginatedData<LocationSearchItemDto>> {
  const skip = (page - 1) * pageSize

  if (!Number.isSafeInteger(skip)) {
    throw LocationSearchServiceError.validation()
  }

  const [links, totalRecords] = await prisma.$transaction([
    prisma.burialLink.findMany({
      where,
      select: LOCATION_SEARCH_SELECT,
      orderBy: [
        { deceased: { searchName: "asc" } },
        { deceased: { internalCode: "asc" } },
        { id: "asc" },
      ],
      skip,
      take: pageSize,
    }),
    prisma.burialLink.count({ where }),
  ])

  return {
    items: links.map(toLocationSearchDto),
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
    },
  }
}

export async function searchLocations(
  input: LocationSearchFiltersInput = {},
): Promise<PaginatedData<LocationSearchItemDto>> {
  await requirePermission(PERMISSION.VIEW_LOCATIONS)

  const parsedInput = locationSearchFiltersSchema.safeParse(input)

  if (!parsedInput.success) {
    throw LocationSearchServiceError.validation()
  }

  const {
    page,
    pageSize,
    deceasedName,
    responsibleName,
    deathDate,
    burialDate,
    burialSpaceIdentifier,
    sector,
    block,
    street,
    row,
    number,
    complement,
  } = parsedInput.data

  const burialSpaceFilters: Prisma.BurialSpaceWhereInput[] = [
    ...(sector ? [locationKeyFilter("sector", sector)] : []),
    ...(block ? [locationKeyFilter("block", block)] : []),
    ...(street ? [locationKeyFilter("street", street)] : []),
    ...(row ? [locationKeyFilter("row", row)] : []),
    ...(number ? [locationKeyFilter("number", number)] : []),
    ...(complement
      ? [locationKeyFilter("complement", complement)]
      : []),
  ]
  const where: Prisma.BurialLinkWhereInput = {
    status: "ACTIVE",
    deceased: {
      is: {
        searchName:
          deceasedName === undefined
            ? undefined
            : { contains: deceasedName },
        deathDate:
          deathDate === undefined
            ? undefined
            : toDateFilter(deathDate),
      },
    },
    responsible:
      responsibleName === undefined
        ? undefined
        : {
            is: {
              searchName: { contains: responsibleName },
            },
          },
    burialSpace: {
      is: {
        identifier: burialSpaceIdentifier,
        AND:
          burialSpaceFilters.length === 0
            ? undefined
            : burialSpaceFilters,
      },
    },
    OR:
      burialDate === undefined
        ? undefined
        : [
            { burialDate: toDateFilter(burialDate) },
            {
              deceased: {
                is: { burialDate: toDateFilter(burialDate) },
              },
            },
          ],
  }

  return findLocationPage(where, page, pageSize)
}

export async function searchLocationsByDocument(
  input: LocationDocumentSearchInput,
): Promise<PaginatedData<LocationSearchItemDto>> {
  await requirePermission(PERMISSION.VIEW_LOCATIONS)

  const parsedInput = locationDocumentSearchSchema.safeParse(input)

  if (!parsedInput.success) {
    throw LocationSearchServiceError.validation()
  }

  const { page, pageSize } = parsedInput.data
  const where: Prisma.BurialLinkWhereInput = {
    status: "ACTIVE",
    ...(parsedInput.data.deceasedDocument !== undefined
      ? {
          deceased: {
            is: {
              document: parsedInput.data.deceasedDocument,
            },
          },
        }
      : {
          responsible: {
            is: {
              document: parsedInput.data.responsibleDocument,
            },
          },
        }),
  }

  return findLocationPage(where, page, pageSize)
}

export async function getLocationDetail(
  deceasedId: string,
): Promise<LocationSearchItemDto> {
  await requirePermission(PERMISSION.VIEW_LOCATIONS)

  const parsedDeceasedId = uuidSchema.safeParse(deceasedId)

  if (!parsedDeceasedId.success) {
    throw LocationSearchServiceError.validation()
  }

  const link = await prisma.burialLink.findFirst({
    where: {
      deceasedId: parsedDeceasedId.data,
      status: "ACTIVE",
    },
    select: LOCATION_SEARCH_SELECT,
  })

  if (!link) {
    throw LocationSearchServiceError.notFound()
  }

  return toLocationSearchDto(link)
}
