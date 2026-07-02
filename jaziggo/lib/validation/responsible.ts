import { z } from "zod"

import {
  optionalTrimmedStringSchema,
  paginationSchema,
  requiredTrimmedStringSchema,
} from "./common"
import {
  documentTypeSchema,
  normalizedDocumentSchema,
  validateDocumentByType,
} from "./document"
import {
  normalizePhone,
  normalizeSearchName,
} from "./normalize"

const normalizedPhoneSchema = requiredTrimmedStringSchema
  .transform(normalizePhone)
  .pipe(z.string().min(1))

const normalizedEmailSchema = requiredTrimmedStringSchema
  .pipe(z.email())
  .transform((email) => email.toLowerCase())

const responsibleContactFields = {
  documentType: documentTypeSchema.optional(),
  document: normalizedDocumentSchema.optional(),
  phone: normalizedPhoneSchema.optional(),
  email: normalizedEmailSchema.optional(),
  address: optionalTrimmedStringSchema,
}

export const createResponsibleSchema = z
  .object({
    fullName: requiredTrimmedStringSchema,
    documentType: documentTypeSchema,
    document: normalizedDocumentSchema,
    phone: normalizedPhoneSchema.optional(),
    email: normalizedEmailSchema.optional(),
    address: optionalTrimmedStringSchema,
  })
  .strict()
  .superRefine(validateDocumentByType)

export const updateResponsibleSchema = z
  .object({
    fullName: optionalTrimmedStringSchema,
    ...responsibleContactFields,
  })
  .strict()
  .superRefine((value, context) => {
    validateDocumentByType(value, context)

    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "Provide at least one field to update",
      })
    }
  })

const normalizedNameFilterSchema = requiredTrimmedStringSchema
  .transform(normalizeSearchName)
  .pipe(z.string().min(1))
  .optional()

export const responsibleListFiltersSchema = paginationSchema
  .extend({
    name: normalizedNameFilterSchema,
  })
  .strict()

const responsibleDocumentSearchSchema = paginationSchema
  .extend({
    documentType: documentTypeSchema,
    document: normalizedDocumentSchema,
    phone: z.never().optional(),
  })
  .strict()

const responsiblePhoneSearchSchema = paginationSchema
  .extend({
    documentType: z.never().optional(),
    document: z.never().optional(),
    phone: normalizedPhoneSchema,
  })
  .strict()

export const responsibleSensitiveSearchFiltersSchema = z.union([
  responsibleDocumentSearchSchema,
  responsiblePhoneSearchSchema,
])

export type CreateResponsibleInput = z.input<
  typeof createResponsibleSchema
>
export type CreateResponsibleData = z.output<
  typeof createResponsibleSchema
>
export type UpdateResponsibleInput = z.input<
  typeof updateResponsibleSchema
>
export type UpdateResponsibleData = z.output<
  typeof updateResponsibleSchema
>
export type ResponsibleListFiltersInput = z.input<
  typeof responsibleListFiltersSchema
>
export type ResponsibleListFilters = z.output<
  typeof responsibleListFiltersSchema
>
export type ResponsibleSensitiveSearchFiltersInput = z.input<
  typeof responsibleSensitiveSearchFiltersSchema
>
export type ResponsibleSensitiveSearchFilters = z.output<
  typeof responsibleSensitiveSearchFiltersSchema
>