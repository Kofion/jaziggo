"use client"

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react"

type ConfirmDialogProps = Readonly<{
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  intent?: "default" | "danger" | "warning"
  children?: ReactNode
  onConfirm: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pending = false,
  intent = "default",
  children,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    cancelButtonRef.current?.focus()

    return () => {
      previousActiveElement?.focus()
    }
  }, [open])

  if (!open) return null

  function closeDialog() {
    if (!pending) {
      onOpenChange(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      closeDialog()
      return
    }

    if (event.key !== "Tab") return

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )

    if (!focusableElements?.length) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
      return
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog()
        }
      }}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg rounded-md border border-zinc-200 bg-white p-5 shadow-xl"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <div>
          <h2 className="text-base font-semibold text-zinc-950" id={titleId}>
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600" id={descriptionId}>
            {description}
          </p>
          {children ? <div className="mt-4 text-sm text-zinc-700">{children}</div> : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
            disabled={pending}
            onClick={closeDialog}
            ref={cancelButtonRef}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            aria-busy={pending}
            className={cx(
              "inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
              intent === "danger"
                ? "bg-red-700 hover:bg-red-800 focus-visible:outline-red-700 disabled:bg-red-300"
                : "bg-zinc-950 hover:bg-zinc-800 focus-visible:outline-zinc-950 disabled:bg-zinc-400",
            )}
            disabled={pending}
            onClick={() => {
              void onConfirm()
            }}
            type="button"
          >
            {pending ? "Confirmando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
