type RequiredMarkProps = Readonly<{
  className?: string
}>

export function RequiredMark({ className }: RequiredMarkProps) {
  return (
    <span aria-hidden="true" className={className ?? "ml-1 text-red-600"}>
      *
    </span>
  )
}