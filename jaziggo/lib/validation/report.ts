import { z } from "zod"

import {
  burialSpaceStatusSchema,
  burialSpaceTypeSchema,
} from "./burial-space"
import { burialLinkStatusSchema } from "./burial-link"
import {
  optionalIsoDateSchema,
  paginationSchema,
  requiredTrimmedStringSchema,
} from "./common"
import { normalizeLocationComponent } from "./normalize"

const reportPeriodFields = {
  startDate: optionalIsoDateSchema,
  endDate: optionalIsoDateSchema,
}

function validateReportPeriod(
  value: { startDate?: string; endDate?: string },
  context: z.RefinementCtx,
): void {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    context.addIssue({
      code: "custom",
      message: "startDate cannot be after endDate",
      path: ["endDate"],
    })
  }
}

export const deceasedReportFiltersSchema = paginationSchema
  .extend(reportPeriodFields)
  .strict()
  .superRefine(validateReportPeriod)

export const burialsByPeriodReportQuerySchema = paginationSchema
  .extend(reportPeriodFields)
  .strict()
  .superRefine(validateReportPeriod)

export const burialsByPeriodReportFiltersSchema = paginationSchema
  .extend({
    ...reportPeriodFields,
    linkStatus: burialLinkStatusSchema.optional(),
  })
  .strict()
  .superRefine(validateReportPeriod)

const normalizedSectorFilterSchema = requiredTrimmedStringSchema
  .transform(normalizeLocationComponent)
  .pipe(z.string().min(1))
  .optional()

export const spaceReportFiltersSchema = paginationSchema
  .extend({
    status: burialSpaceStatusSchema.optional(),
    type: burialSpaceTypeSchema.optional(),
    sector: normalizedSectorFilterSchema,
    linkStatus: burialLinkStatusSchema.optional(),
  })
  .strict()

export const spaceReportQuerySchema = paginationSchema
  .extend({
    status: burialSpaceStatusSchema.optional(),
    type: burialSpaceTypeSchema.optional(),
    sector: normalizedSectorFilterSchema,
  })
  .strict()

export const spaceOccupationReportFiltersSchema = spaceReportFiltersSchema
export const spaceStatusReportFiltersSchema = spaceReportFiltersSchema

export type DeceasedReportFiltersInput = z.input<
  typeof deceasedReportFiltersSchema
>
export type DeceasedReportFilters = z.output<
  typeof deceasedReportFiltersSchema
>
export type BurialsByPeriodReportFiltersInput = z.input<
  typeof burialsByPeriodReportFiltersSchema
>
export type BurialsByPeriodReportFilters = z.output<
  typeof burialsByPeriodReportFiltersSchema
>
export type SpaceReportFiltersInput = z.input<
  typeof spaceReportFiltersSchema
>
export type SpaceReportFilters = z.output<
  typeof spaceReportFiltersSchema
>
