import { z } from "zod"

import {
  optionalIsoDateSchema,
  paginationSchema,
  requiredTrimmedStringSchema,
  uuidSchema,
} from "./common"

export const burialLinkStatusSchema = z.enum(["ACTIVE", "ENDED"])

export const createBurialLinkSchema = z
  .object({
    deceasedId: uuidSchema,
    burialSpaceId: uuidSchema,
    responsibleId: uuidSchema.optional(),
    confirmation: z.literal(true).optional(),
  })
  .strict()
  .transform((value) => ({
    ...value,
    status: "ACTIVE" as const,
  }))

export const endBurialLinkSchema = z
  .object({
    endedAt: z.iso.datetime({ offset: true }),
    endReason: requiredTrimmedStringSchema,
    confirmation: z.literal(true),
  })
  .strict()

export const burialLinkListFiltersSchema = paginationSchema
  .extend({
    deceasedId: uuidSchema.optional(),
    burialSpaceId: uuidSchema.optional(),
    responsibleId: uuidSchema.optional(),
    status: burialLinkStatusSchema.optional(),
    startDate: optionalIsoDateSchema,
    endDate: optionalIsoDateSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      context.addIssue({
        code: "custom",
        message: "startDate cannot be after endDate",
        path: ["endDate"],
      })
    }
  })

export type CreateBurialLinkInput = z.input<
  typeof createBurialLinkSchema
>
export type CreateBurialLinkData = z.output<
  typeof createBurialLinkSchema
>
export type EndBurialLinkInput = z.input<typeof endBurialLinkSchema>
export type EndBurialLinkData = z.output<typeof endBurialLinkSchema>
export type BurialLinkListFiltersInput = z.input<
  typeof burialLinkListFiltersSchema
>
export type BurialLinkListFilters = z.output<
  typeof burialLinkListFiltersSchema
>
