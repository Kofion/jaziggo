import { z } from "zod"

import {
  optionalTrimmedStringSchema,
  paginationSchema,
  requiredTrimmedStringSchema,
} from "./common"
import {
  normalizeDocument,
  normalizePhone,
  normalizeSearchName,
} from "./normalize"

const normalizedDocumentSchema = requiredTrimmedStringSchema
  .transform(normalizeDocument)
  .pipe(z.string().min(1))

const normalizedPhoneSchema = requiredTrimmedStringSchema
  .transform(normalizePhone)
  .pipe(z.string().min(1))

const normalizedEmailSchema = requiredTrimmedStringSchema
  .pipe(z.email())
  .transform((email) => email.toLowerCase())

const responsibleContactFields = {
  document: normalizedDocumentSchema.optional(),
  phone: normalizedPhoneSchema.optional(),
  email: normalizedEmailSchema.optional(),
  address: optionalTrimmedStringSchema,
}

type ResponsibleContacts = {
  document?: string
  phone?: string
  email?: string
  address?: string
}

function requireContact(
  value: ResponsibleContacts,
  context: z.RefinementCtx,
): void {
  if (value.document || value.phone || value.email || value.address) {
    return
  }

  context.addIssue({
    code: "custom",
    message: "Provide at least one document, phone, email, or address",
    path: ["document"],
  })
}

export const createResponsibleSchema = z
  .object({
    fullName: requiredTrimmedStringSchema,
    ...responsibleContactFields,
  })
  .strict()
  .superRefine(requireContact)

export const updateResponsibleSchema = z
  .object({
    fullName: optionalTrimmedStringSchema,
    ...responsibleContactFields,
  })
  .strict()
  .superRefine((value, context) => {
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
    document: normalizedDocumentSchema,
    phone: z.never().optional(),
  })
  .strict()

const responsiblePhoneSearchSchema = paginationSchema
  .extend({
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
