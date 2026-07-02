import type { LocationSearchItem } from "@/components/location/location-search-form"
import type {
  BurialSpaceStatus,
  BurialSpaceType,
} from "@/types/burial-space"

type LocationDetailProps = Readonly<{
  item?: LocationSearchItem
  className?: string
}>

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
})

const SPACE_TYPE_LABELS = {
  SEPULTURA: "Sepultura",
  JAZIGO: "Jazigo",
} as const satisfies Record<BurialSpaceType, string>

const STATUS_LABELS = {
  AVAILABLE: "Disponível",
  OCCUPIED: "Ocupado",
  RESERVED: "Reservado",
  INACTIVE: "Inativo",
} as const satisfies Record<BurialSpaceStatus, string>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "Não informada"
  }

  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`))
}

function documentValue(value: string | undefined) {
  return value ?? "Não informado"
}

export function LocationDetail({ item, className }: LocationDetailProps) {
  if (!item) {
    return (
      <section
        aria-live="polite"
        className={cx("rounded-md border border-zinc-200 bg-white p-4", className)}
      >
        <h2 className="text-base font-semibold text-zinc-950">
          Orientação de localização
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Selecione um resultado para visualizar a orientação padronizada.
        </p>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="location-detail-heading"
      className={cx("rounded-md border border-zinc-200 bg-white p-4", className)}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          Orientação de atendimento
        </p>
        <h2
          className="text-base font-semibold text-zinc-950"
          id="location-detail-heading"
        >
          {item.locationDescription}
        </h2>
        <p className="text-sm text-zinc-600">
          {SPACE_TYPE_LABELS[item.burialSpaceType]} com status{" "}
          {STATUS_LABELS[item.status].toLowerCase()}.
        </p>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            Código interno
          </dt>
          <dd className="mt-1 font-mono text-xs font-semibold text-zinc-800">
            {item.internalCode}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            Falecido
          </dt>
          <dd className="mt-1 font-medium text-zinc-950">{item.deceasedName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            Documento do falecido
          </dt>
          <dd className="mt-1 font-mono text-xs text-zinc-700">
            {documentValue(item.deceasedDocumentMasked)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            Responsável
          </dt>
          <dd className="mt-1 text-zinc-800">
            {item.responsibleName ?? "Não informado"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            Documento do responsável
          </dt>
          <dd className="mt-1 font-mono text-xs text-zinc-700">
            {documentValue(item.responsibleDocumentMasked)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            Sepultamento
          </dt>
          <dd className="mt-1 text-zinc-800">{formatDate(item.burialDate)}</dd>
        </div>
      </dl>

      {item.historicalDataIncomplete ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
          Registro histórico incompleto. Confirme a orientação usando código
          interno, datas e responsável quando disponíveis.
        </p>
      ) : null}
    </section>
  )
}
