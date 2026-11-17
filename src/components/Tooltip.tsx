import { useId, useState, type ReactNode } from 'react'

type Props = {
  text: string
  children: ReactNode
}

export function Tooltip({ text, children }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-mid)] text-[11px] font-semibold text-[var(--color-brown-deep)]"
        aria-describedby={open ? id : undefined}
        aria-label="คำอธิบาย"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-2 w-56 whitespace-pre-line rounded-lg bg-[var(--color-ink)] px-3 py-2 text-left text-xs leading-relaxed text-[var(--color-paper)] shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  )
}
