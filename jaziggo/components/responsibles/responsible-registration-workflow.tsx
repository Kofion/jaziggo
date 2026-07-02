"use client"

import { useState } from "react"

import { ResponsibleForm } from "@/components/responsibles/responsible-form"
import { ResponsibleLinkForm } from "@/components/responsibles/responsible-link-form"
import type { ResponsibleDetailDto, ResponsibleListItemDto } from "@/types/responsible"

type CreatedResponsible = ResponsibleDetailDto | ResponsibleListItemDto

export function ResponsibleRegistrationWorkflow() {
  const [createdResponsible, setCreatedResponsible] = useState<CreatedResponsible | null>(null)

  return (
    <div className="space-y-4">
      <ResponsibleForm mode="create" onSuccess={setCreatedResponsible} />

      {createdResponsible ? (
        <section className="space-y-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Vínculos do responsável cadastrado
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-700">
              {createdResponsible.fullName} foi salvo. Agora vincule este responsável a um falecido ou a uma sepultura ou jazigo.
            </p>
          </div>

          <ResponsibleLinkForm responsibleId={createdResponsible.id} />
        </section>
      ) : null}
    </div>
  )
}