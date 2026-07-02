import { ActionLink } from "@/components/ui/action-link"
import type { ResponsibleListItemDto } from "@/types/responsible"

type ResponsibleTableProps = Readonly<{
  responsibles: readonly ResponsibleListItemDto[]
}>

export function ResponsibleTable({ responsibles }: ResponsibleTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <caption className="sr-only">Responsáveis cadastrados</caption>
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
          <tr>
            <th className="px-4 py-3" scope="col">
              Nome
            </th>
            <th className="px-4 py-3" scope="col">
              Documento
            </th>
            <th className="px-4 py-3" scope="col">
              Ação
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {responsibles.map((responsible) => (
            <tr className="hover:bg-zinc-50" key={responsible.id}>
              <th className="px-4 py-3 text-left font-medium text-zinc-950" scope="row">
                {responsible.fullName}
              </th>
              <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                {responsible.documentMasked ?? "Não informado"}
              </td>
              <td className="px-4 py-3">
                <ActionLink
                  ariaLabel={`Mais detalhes de ${responsible.fullName}`}
                  href={`/responsibles/${responsible.id}`}
                >
                  Mais detalhes
                </ActionLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
