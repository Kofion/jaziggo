import { z } from "zod"

import {
  optionalIsoDateSchema,
  optionalTrimmedStringSchema,
  paginationSchema,
  requiredTrimmedStringSchema,
  uuidSchema,
} from "./common"
import { normalizeDocument, normalizeSearchName } from "./normalize"

const normalizedDocumentSchema = requiredTrimmedStringSchema
  .transform(normalizeDocument)
  .pipe(z.string().min(1))

const normalizedSearchNameSchema = requiredTrimmedStringSchema
  .transform(normalizeSearchName)
  .pipe(z.string().min(1))

const deceasedFieldsSchema = z
  .object({
    fullName: requiredTrimmedStringSchema,
    document: normalizedDocumentSchema.optional(),
    birthDate: optionalIsoDateSchema,
    deathDate: optionalIsoDateSchema,
    burialDate: optionalIsoDateSchema,
    datesUnknown: z.boolean().optional(),
    notes: optionalTrimmedStringSchema,
  })
  .strict()

type DeceasedDates = {
  birthDate?: string
  deathDate?: string
  burialDate?: string
  datesUnknown?: boolean
}

function validateDeceasedDates(
  dates: DeceasedDates,
  context: z.RefinementCtx,
): void {
  const { birthDate, deathDate, burialDate, datesUnknown } = dates

  if (!deathDate && !burialDate && datesUnknown !== true) {
    context.addIssue({
      code: "custom",
      message: "Provide deathDate, burialDate, or set datesUnknown to true",
      path: ["datesUnknown"],
    })
  }

  if (datesUnknown === true && (deathDate || burialDate)) {
    context.addIssue({
      code: "custom",
      message: "Known dates must be omitted when datesUnknown is true",
      path: ["datesUnknown"],
    })
  }

  if (birthDate && deathDate && birthDate > deathDate) {
    context.addIssue({
      code: "custom",
      message: "birthDate cannot be after deathDate",
      path: ["birthDate"],
    })
  }

  if (birthDate && burialDate && birthDate > burialDate) {
    context.addIssue({
      code: "custom",
      message: "birthDate cannot be after burialDate",
      path: ["birthDate"],
    })
  }

  if (deathDate && burialDate && burialDate < deathDate) {
    context.addIssue({
      code: "custom",
      message: "burialDate cannot be before deathDate",
      path: ["burialDate"],
    })
  }
}

export const createDeceasedSchema = deceasedFieldsSchema.superRefine(
  validateDeceasedDates,
)

export const updateDeceasedSchema = deceasedFieldsSchema.superRefine(
  validateDeceasedDates,
)

export const deceasedListFiltersSchema = paginationSchema
  .extend({
    name: normalizedSearchNameSchema.optional(),
    internalCode: optionalTrimmedStringSchema,
    deathDate: optionalIsoDateSchema,
    burialDate: optionalIsoDateSchema,
    burialSpaceId: uuidSchema.optional(),
  })
  .strict()

export const deceasedExactDocumentSearchSchema = paginationSchema
  .extend({
    document: normalizedDocumentSchema,
  })
  .strict()

export type CreateDeceasedInput = z.input<typeof createDeceasedSchema>
export type CreateDeceasedData = z.output<typeof createDeceasedSchema>
export type UpdateDeceasedInput = z.input<typeof updateDeceasedSchema>
export type UpdateDeceasedData = z.output<typeof updateDeceasedSchema>
export type DeceasedListFiltersInput = z.input<
  typeof deceasedListFiltersSchema
>
export type DeceasedListFilters = z.output<
  typeof deceasedListFiltersSchema
>
export type DeceasedExactDocumentSearchInput = z.input<
  typeof deceasedExactDocumentSearchSchema
>
export type DeceasedExactDocumentSearch = z.output<
  typeof deceasedExactDocumentSearchSchema
>
