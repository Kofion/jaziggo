"use client"

import { useState } from "react"

import { CreateLinkForm } from "@/components/burial-links/create-link-form"
import { DeceasedForm } from "@/components/deceased/deceased-form"
import { ResponsibleLinkForm } from "@/components/responsibles/responsible-link-form"
import type { DeceasedDetailDto } from "@/types/deceased"

export function DeceasedRegistrationWorkflow() {
  const [createdDeceased, setCreatedDeceased] = useState<DeceasedDetailDto | null>(null)

  return (
    <div className="space-y-4">
      <DeceasedForm mode="create" onSuccess={setCreatedDeceased} />

      {createdDeceased ? (
        <section className="space-y-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Vínculos do falecido cadastrado
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-700">
              {createdDeceased.fullName} foi salvo com o código {createdDeceased.internalCode}. Agora vincule o registro a uma sepultura ou jazigo e, se necessário, a um responsável.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <CreateLinkForm deceasedId={createdDeceased.id} />
            <ResponsibleLinkForm deceasedId={createdDeceased.id} />
          </div>
        </section>
      ) : null}
    </div>
  )
}