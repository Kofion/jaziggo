type LoadingStateProps = Readonly<{
  label?: string
  description?: string
  rows?: number
  className?: string
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function LoadingState({
  label = "Carregando informações",
  description = "Aguarde enquanto os dados são preparados.",
  rows = 3,
  className,
}: LoadingStateProps) {
  const visibleRows = Math.max(1, Math.min(rows, 8))

  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className={cx("rounded-md border border-zinc-200 bg-white px-4 py-4", className)}
      role="status"
    >
      <div className="mb-4">
        <p className="text-sm font-semibold text-zinc-950">{label}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      <div aria-hidden="true" className="space-y-3">
        {Array.from({ length: visibleRows }, (_, index) => (
          <div
            className="grid grid-cols-12 gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-3"
            key={index}
          >
            <div className="col-span-7 h-3 rounded-sm bg-zinc-200 motion-safe:animate-pulse" />
            <div className="col-span-3 h-3 rounded-sm bg-zinc-200 motion-safe:animate-pulse" />
            <div className="col-span-2 h-3 rounded-sm bg-zinc-200 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  )
}
