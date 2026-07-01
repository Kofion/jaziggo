import {
  BURIAL_SPACE_STATUS,
  BURIAL_SPACE_TYPE,
  type BurialSpaceStatus,
  type BurialSpaceType,
} from "@/types/burial-space"

export const REPORT_TYPE = {
  DECEASED: "deceased",
  BURIALS_BY_PERIOD: "burials-by-period",
  SPACE_OCCUPATION: "space-occupation",
  SPACE_STATUS: "space-status",
} as const

export type ReportType = (typeof REPORT_TYPE)[keyof typeof REPORT_TYPE]

export type ReportFilterValues = Readonly<{
  reportType: ReportType
  pageSize: number
  startDate?: string
  endDate?: string
  status?: BurialSpaceStatus
  type?: BurialSpaceType
  sector?: string
}>

const REPORT_TYPE_OPTIONS = [
  { label: "Falecidos cadastrados", value: REPORT_TYPE.DECEASED },
  { label: "Sepultamentos por período", value: REPORT_TYPE.BURIALS_BY_PERIOD },
  { label: "Ocupação de espaços", value: REPORT_TYPE.SPACE_OCCUPATION },
  { label: "Espaços por status", value: REPORT_TYPE.SPACE_STATUS },
] as const

const SPACE_TYPE_OPTIONS = [
  { label: "Todos os tipos", value: "" },
  { label: "Sepulturas", value: BURIAL_SPACE_TYPE.SEPULTURA },
  { label: "Jazigos", value: BURIAL_SPACE_TYPE.JAZIGO },
] as const

const SPACE_STATUS_OPTIONS = [
  { label: "Todos os status", value: "" },
  { label: "Disponíveis", value: BURIAL_SPACE_STATUS.AVAILABLE },
  { label: "Ocupados", value: BURIAL_SPACE_STATUS.OCCUPIED },
  { label: "Reservados", value: BURIAL_SPACE_STATUS.RESERVED },
  { label: "Inativos", value: BURIAL_SPACE_STATUS.INACTIVE },
] as const

type ReportFiltersProps = Readonly<{
  values: ReportFilterValues
}>

export function reportTypeLabel(reportType: ReportType) {
  return (
    REPORT_TYPE_OPTIONS.find((option) => option.value === reportType)?.label ??
    "Relatório"
  )
}

export function ReportFilters({ values }: ReportFiltersProps) {
  const usesPeriodFilters =
    values.reportType === REPORT_TYPE.DECEASED ||
    values.reportType === REPORT_TYPE.BURIALS_BY_PERIOD
  const usesSpaceFilters =
    values.reportType === REPORT_TYPE.SPACE_OCCUPATION ||
    values.reportType === REPORT_TYPE.SPACE_STATUS

  return (
    <form
      action="/reports"
      className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
      method="get"
    >
      <input name="pageSize" type="hidden" value={values.pageSize} />

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-800" htmlFor="reportType">
          Tipo de relatório
        </label>
        <select
          className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
          defaultValue={values.reportType}
          id="reportType"
          name="reportType"
        >
          {REPORT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {usesPeriodFilters ? (
        <>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor="startDate"
            >
              Inicio
            </label>
            <input
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              defaultValue={values.startDate ?? ""}
              id="startDate"
              name="startDate"
              type="date"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor="endDate"
            >
              Fim
            </label>
            <input
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              defaultValue={values.endDate ?? ""}
              id="endDate"
              name="endDate"
              type="date"
            />
          </div>
        </>
      ) : null}

      {usesSpaceFilters ? (
        <>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor="sector"
            >
              Setor
            </label>
            <input
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              defaultValue={values.sector ?? ""}
              id="sector"
              name="sector"
              type="search"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor="type"
            >
              Espaço
            </label>
            <select
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              defaultValue={values.type ?? ""}
              id="type"
              name="type"
            >
              {SPACE_TYPE_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-zinc-800"
              htmlFor="status"
            >
              Status do espaço
            </label>
            <select
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
              defaultValue={values.status ?? ""}
              id="status"
              name="status"
            >
              {SPACE_STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      <div className="flex items-end lg:col-start-4">
        <button
          aria-label="Aplicar filtros de relatório"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
          type="submit"
        >
          Aplicar filtros
        </button>
      </div>
    </form>
  )
}
