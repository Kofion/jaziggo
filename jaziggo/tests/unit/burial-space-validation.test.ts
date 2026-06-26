import { describe, expect, it } from "vitest"

import {
  burialSpaceListFiltersSchema,
  createBurialSpaceSchema,
  updateBurialSpaceSchema,
  updateBurialSpaceStatusSchema,
} from "@/lib/validation/burial-space"

describe("burial space validation", () => {
  it("accepts valid sepultura creation with fixed capacity and row location", () => {
    const result = createBurialSpaceSchema.safeParse({
      type: "SEPULTURA",
      identifier: " SEP-001 ",
      status: "AVAILABLE",
      capacity: 1,
      row: " Row A ",
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).toMatchObject({
      type: "SEPULTURA",
      identifier: "SEP-001",
      status: "AVAILABLE",
      capacity: 1,
      row: "Row A",
      locationKey: "row=row%20a",
    })
  })

  it("rejects sepultura creation with invalid capacity or occupied initial status", () => {
    expect(
      createBurialSpaceSchema.safeParse({
        type: "SEPULTURA",
        identifier: "SEP-002",
        status: "AVAILABLE",
        capacity: 2,
        sector: "Sector A",
      }).success,
    ).toBe(false)

    expect(
      createBurialSpaceSchema.safeParse({
        type: "SEPULTURA",
        identifier: "SEP-003",
        status: "OCCUPIED",
        capacity: 1,
        sector: "Sector A",
      }).success,
    ).toBe(false)
  })

  it("accepts valid jazigo creation with positive safe capacity", () => {
    const result = createBurialSpaceSchema.safeParse({
      type: "JAZIGO",
      identifier: " JAZ-001 ",
      status: "RESERVED",
      capacity: 4,
      sector: " Sector 1 ",
      block: " Block B ",
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).toMatchObject({
      type: "JAZIGO",
      identifier: "JAZ-001",
      status: "RESERVED",
      capacity: 4,
      sector: "Sector 1",
      block: "Block B",
      locationKey: "sector=sector%201|block=block%20b",
    })
  })

  it.each([
    { capacity: 0, label: "zero" },
    { capacity: -1, label: "negative" },
    { capacity: 1.5, label: "decimal" },
    { capacity: Number.MAX_SAFE_INTEGER + 1, label: "unsafe" },
  ])("rejects invalid jazigo capacity: $label", ({ capacity }) => {
    expect(
      createBurialSpaceSchema.safeParse({
        type: "JAZIGO",
        identifier: "JAZ-002",
        status: "AVAILABLE",
        capacity,
        sector: "Sector A",
      }).success,
    ).toBe(false)
  })

  it("requires at least one non-empty location component", () => {
    expect(
      createBurialSpaceSchema.safeParse({
        type: "JAZIGO",
        identifier: "JAZ-003",
        status: "AVAILABLE",
        capacity: 2,
      }).success,
    ).toBe(false)

    expect(
      createBurialSpaceSchema.safeParse({
        type: "JAZIGO",
        identifier: "JAZ-004",
        status: "AVAILABLE",
        capacity: 2,
        row: "   ",
      }).success,
    ).toBe(false)
  })

  it("accepts row as the only update location component", () => {
    const result = updateBurialSpaceSchema.safeParse({
      type: "JAZIGO",
      identifier: "JAZ-005",
      capacity: 3,
      row: " Row C ",
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).toMatchObject({
      type: "JAZIGO",
      identifier: "JAZ-005",
      capacity: 3,
      row: "Row C",
      locationKey: "row=row%20c",
    })
  })

  it("rejects update payloads with creation-only status or invalid row value", () => {
    expect(
      updateBurialSpaceSchema.safeParse({
        type: "SEPULTURA",
        identifier: "SEP-004",
        capacity: 1,
        row: "Row D",
        status: "AVAILABLE",
      }).success,
    ).toBe(false)

    expect(
      updateBurialSpaceSchema.safeParse({
        type: "SEPULTURA",
        identifier: "SEP-005",
        capacity: 1,
        row: "   ",
      }).success,
    ).toBe(false)
  })

  it("validates explicit status changes with confirmation", () => {
    expect(
      updateBurialSpaceStatusSchema.safeParse({
        status: "OCCUPIED",
        confirmation: true,
      }).success,
    ).toBe(true)

    expect(
      updateBurialSpaceStatusSchema.safeParse({
        status: "RESERVED",
        confirmation: false,
      }).success,
    ).toBe(false)
  })

  it("normalizes list filters including row", () => {
    const result = burialSpaceListFiltersSchema.safeParse({
      page: "2",
      pageSize: "10",
      identifier: " JAZ ",
      type: "JAZIGO",
      status: "AVAILABLE",
      row: " Row A ",
      sector: " Sector 1 ",
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).toEqual({
      page: 2,
      pageSize: 10,
      identifier: "JAZ",
      type: "JAZIGO",
      status: "AVAILABLE",
      row: "row a",
      sector: "sector 1",
    })
  })
})
