import { z } from "zod"

import {
  optionalTrimmedStringSchema,
  paginationSchema,
  requiredTrimmedStringSchema,
} from "./common"
import {
  generateLocationKey,
  LOCATION_COMPONENT_KEYS,
  normalizeLocationComponent,
} from "./normalize"

export const burialSpaceTypeSchema = z.enum(["SEPULTURA", "JAZIGO"])

export const burialSpaceStatusSchema = z.enum([
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "INACTIVE",
])

export const initialBurialSpaceStatusSchema = z.enum([
  "AVAILABLE",
  "RESERVED",
  "INACTIVE",
])

const burialSpaceLocationFields = {
  sector: optionalTrimmedStringSchema,
  block: optionalTrimmedStringSchema,
  street: optionalTrimmedStringSchema,
  row: optionalTrimmedStringSchema,
  number: optionalTrimmedStringSchema,
  complement: optionalTrimmedStringSchema,
}

type BurialSpaceLocationFields = Partial<
  Record<(typeof LOCATION_COMPONENT_KEYS)[number], string>
>

function requireLocation(
  value: BurialSpaceLocationFields,
  context: z.RefinementCtx,
): void {
  if (LOCATION_COMPONENT_KEYS.some((key) => value[key] !== undefined)) {
    return
  }

  context.addIssue({
    code: "custom",
    message: "Provide at least one location component",
    path: ["sector"],
  })
}

const createBurialSpaceBaseFields = {
  identifier: requiredTrimmedStringSchema,
  status: initialBurialSpaceStatusSchema,
  ...burialSpaceLocationFields,
}

export const createBurialSpaceSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        ...createBurialSpaceBaseFields,
        type: z.literal("SEPULTURA"),
        capacity: z.literal(1),
      })
      .strict(),
    z
      .object({
        ...createBurialSpaceBaseFields,
        type: z.literal("JAZIGO"),
        capacity: z.number().int().positive().safe(),
      })
      .strict(),
  ])
  .superRefine(requireLocation)
  .transform((value) => ({
    ...value,
    locationKey: generateLocationKey(value),
  }))

export const updateBurialSpaceSchema = z
  .object({
    type: burialSpaceTypeSchema.optional(),
    identifier: optionalTrimmedStringSchema,
    capacity: z.number().int().positive().safe().optional(),
    ...burialSpaceLocationFields,
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "Provide at least one field to update",
      })
    }

    if (value.type === "SEPULTURA" && value.capacity !== undefined) {
      if (value.capacity !== 1) {
        context.addIssue({
          code: "custom",
          message: "SEPULTURA capacity must be 1",
          path: ["capacity"],
        })
      }
    }
  })

export const updateBurialSpaceStatusSchema = z
  .object({
    status: burialSpaceStatusSchema,
    confirmation: z.literal(true),
  })
  .strict()

const normalizedLocationFilterSchema = requiredTrimmedStringSchema
  .transform(normalizeLocationComponent)
  .pipe(z.string().min(1))
  .optional()

export const burialSpaceListFiltersSchema = paginationSchema
  .extend({
    identifier: optionalTrimmedStringSchema,
    type: burialSpaceTypeSchema.optional(),
    status: burialSpaceStatusSchema.optional(),
    sector: normalizedLocationFilterSchema,
    block: normalizedLocationFilterSchema,
    street: normalizedLocationFilterSchema,
    row: normalizedLocationFilterSchema,
    number: normalizedLocationFilterSchema,
    complement: normalizedLocationFilterSchema,
  })
  .strict()

export type CreateBurialSpaceInput = z.input<
  typeof createBurialSpaceSchema
>
export type CreateBurialSpaceData = z.output<
  typeof createBurialSpaceSchema
>
export type UpdateBurialSpaceInput = z.input<
  typeof updateBurialSpaceSchema
>
export type UpdateBurialSpaceData = z.output<
  typeof updateBurialSpaceSchema
>
export type UpdateBurialSpaceStatusInput = z.input<
  typeof updateBurialSpaceStatusSchema
>
export type UpdateBurialSpaceStatusData = z.output<
  typeof updateBurialSpaceStatusSchema
>
export type BurialSpaceListFiltersInput = z.input<
  typeof burialSpaceListFiltersSchema
>
export type BurialSpaceListFilters = z.output<
  typeof burialSpaceListFiltersSchema
>
