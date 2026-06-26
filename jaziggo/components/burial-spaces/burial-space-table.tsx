import Link from "next/link"

import type {
  BurialSpaceListItemDto,
  BurialSpaceStatus,
  BurialSpaceType,
} from "@/types/burial-space"

type BurialSpaceTableProps = Readonly<{
  spaces: readonly BurialSpaceListItemDto[]
}>

const TYPE_LABELS = {
  SEPULTURA: "Sepultura",
  JAZIGO: "Jazigo",
} as const satisfies Record<BurialSpaceType, string>

const STATUS_LABELS = {
  AVAILABLE: "Disponivel",
  OCCUPIED: "Ocupado",
  RESERVED: "Reservado",
  INACTIVE: "Inativo",
} as const satisfies Record<BurialSpaceStatus, string>

function statusClassName(status: BurialSpaceStatus) {
  if (status === "AVAILABLE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }

  if (status === "OCCUPIED") {
    return "border-sky-200 bg-sky-50 text-sky-800"
  }

  if (status === "RESERVED") {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700"
}

function formatLocation(space: BurialSpaceListItemDto) {
  const parts = [
    space.sector ? `Setor ${space.sector}` : null,
    space.block ? `Bloco ${space.block}` : null,
    space.street ? `Rua ${space.street}` : null,
    space.row ? `Quadra/Fila ${space.row}` : null,
    space.number ? `Numero ${space.number}` : null,
    space.complement,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" - ") : "Localizacao nao informada"
}

function formatOccupancy(space: BurialSpaceListItemDto) {
  return `${space.activeLinkCount}/${space.capacity}`
}

export function BurialSpaceTable({ spaces }: BurialSpaceTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <caption className="sr-only">Sepulturas e jazigos cadastrados</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
          <tr>
            <th className="px-4 py-3" scope="col">
              Identificacao
            </th>
            <th className="px-4 py-3" scope="col">
              Tipo
            </th>
            <th className="px-4 py-3" scope="col">
              Localizacao
            </th>
            <th className="px-4 py-3" scope="col">
              Status
            </th>
            <th className="px-4 py-3" scope="col">
              Ocupacao
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {spaces.map((space) => (
            <tr className="hover:bg-zinc-50" key={space.id}>
              <th className="px-4 py-3 text-left font-medium text-zinc-950" scope="row">
                <Link
                  className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                  href={`/burial-spaces/${space.id}`}
                >
                  {space.identifier}
                </Link>
              </th>
              <td className="px-4 py-3 text-zinc-700">{TYPE_LABELS[space.type]}</td>
              <td className="max-w-md px-4 py-3 text-zinc-700">{formatLocation(space)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClassName(
                    space.status,
                  )}`}
                >
                  {STATUS_LABELS[space.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-700">{formatOccupancy(space)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
