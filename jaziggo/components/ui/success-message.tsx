type SuccessMessageProps = Readonly<{
  message: string
  title?: string
  id?: string
  className?: string
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function SuccessMessage({
  message,
  title = "Operacao concluida",
  id,
  className,
}: SuccessMessageProps) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={cx(
        "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900",
        className,
      )}
      id={id}
      role="status"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-6">{message}</p>
    </div>
  )
}

