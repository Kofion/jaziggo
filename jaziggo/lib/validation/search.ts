import { z } from "zod"

import {
  optionalIsoDateSchema,
  optionalTrimmedStringSchema,
  paginationSchema,
  requiredTrimmedStringSchema,
} from "./common"
import { documentTypeSchema, normalizeDocumentNumber } from "./document"
import {
  normalizeLocationComponent,
  normalizeSearchName,
} from "./normalize"

const normalizedNameFilterSchema = requiredTrimmedStringSchema
  .transform(normalizeSearchName)
  .pipe(z.string().min(1))
  .optional()

const normalizedLocationFilterSchema = requiredTrimmedStringSchema
  .transform(normalizeLocationComponent)
  .pipe(z.string().min(1))
  .optional()

const normalizedDocumentSchema = requiredTrimmedStringSchema
  .transform(normalizeDocumentNumber)
  .pipe(z.string().min(1))

export const locationSearchFiltersSchema = paginationSchema
  .extend({
    deceasedName: normalizedNameFilterSchema,
    responsibleName: normalizedNameFilterSchema,
    deathDate: optionalIsoDateSchema,
    burialDate: optionalIsoDateSchema,
    burialSpaceIdentifier: optionalTrimmedStringSchema,
    sector: normalizedLocationFilterSchema,
    block: normalizedLocationFilterSchema,
    street: normalizedLocationFilterSchema,
    row: normalizedLocationFilterSchema,
    number: normalizedLocationFilterSchema,
    complement: normalizedLocationFilterSchema,
  })
  .strict()

const deceasedDocumentSearchSchema = paginationSchema
  .extend({
    documentType: documentTypeSchema,
    deceasedDocument: normalizedDocumentSchema,
    responsibleDocument: z.never().optional(),
  })
  .strict()

const responsibleDocumentSearchSchema = paginationSchema
  .extend({
    documentType: documentTypeSchema,
    deceasedDocument: z.never().optional(),
    responsibleDocument: normalizedDocumentSchema,
  })
  .strict()

export const locationDocumentSearchSchema = z.union([
  deceasedDocumentSearchSchema,
  responsibleDocumentSearchSchema,
])

export type LocationSearchFiltersInput = z.input<
  typeof locationSearchFiltersSchema
>
export type LocationSearchFilters = z.output<
  typeof locationSearchFiltersSchema
>
export type LocationDocumentSearchInput = z.input<
  typeof locationDocumentSearchSchema
>
export type LocationDocumentSearch = z.output<
  typeof locationDocumentSearchSchema
>
