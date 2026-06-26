import type { ReactNode } from "react"

type ErrorMessageProps = Readonly<{
  message: string
  title?: string
  requestId?: string
  action?: ReactNode
  id?: string
  className?: string
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function ErrorMessage({
  message,
  title = "Não foi possível concluir a operação",
  requestId,
  action,
  id,
  className,
}: ErrorMessageProps) {
  return (
    <div
      aria-atomic="true"
      aria-live="assertive"
      className={cx(
        "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900",
        className,
      )}
      id={id}
      role="alert"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-6">{message}</p>
      {requestId ? (
        <p className="mt-2 text-xs font-medium text-red-800">ID da solicitação: {requestId}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
