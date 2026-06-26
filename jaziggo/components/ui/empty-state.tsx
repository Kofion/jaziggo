import type { ReactNode } from "react"

type EmptyStateProps = Readonly<{
  title: string
  description: string
  action?: ReactNode
  className?: string
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <section
      aria-live="polite"
      className={cx(
        "rounded-md border border-dashed border-zinc-300 bg-white px-6 py-8 text-center",
        className,
      )}
      role="status"
    >
      <div className="mx-auto max-w-xl">
        <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </section>
  )
}
