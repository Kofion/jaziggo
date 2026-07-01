import Link from "next/link"
import type { ReactNode } from "react"

type ActionLinkProps = Readonly<{
  href: string
  children: ReactNode
  variant?: "detail" | "back"
  ariaLabel?: string
}>

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function ActionLink({
  href,
  children,
  variant = "detail",
  ariaLabel,
}: ActionLinkProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={cx(
        "inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        variant === "back"
          ? "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600"
          : "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600",
      )}
      href={href}
    >
      {children}
    </Link>
  )
}

