"use client"

import { useState } from "react"

import { CreateLinkForm } from "@/components/burial-links/create-link-form"
import { BurialSpaceForm } from "@/components/burial-spaces/burial-space-form"
import { ResponsibleLinkForm } from "@/components/responsibles/responsible-link-form"
import type { BurialSpaceListItemDto } from "@/types/burial-space"

export function BurialSpaceRegistrationWorkflow() {
  const [createdSpace, setCreatedSpace] = useState<BurialSpaceListItemDto | null>(null)

  return (
    <div className="space-y-4">
      <BurialSpaceForm mode="create" onSuccess={setCreatedSpace} />

      {createdSpace ? (
        <section className="space-y-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Vínculos do espaço cadastrado
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-700">
              {createdSpace.identifier} foi salvo. Agora vincule este espaço a um falecido e cadastre o responsável administrativo do jazigo ou sepultura.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <CreateLinkForm burialSpaceId={createdSpace.id} />
            <ResponsibleLinkForm burialSpaceId={createdSpace.id} />
          </div>
        </section>
      ) : null}
    </div>
  )
}