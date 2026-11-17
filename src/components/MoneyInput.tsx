import { formatBahtAmount } from '../engine'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  optional?: boolean
}

export function MoneyInput({ id, label, value, onChange, hint, optional }: Props) {
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2 text-sm font-semibold text-[var(--color-ink)]">
        <span>{label}</span>
        {optional && (
          <span className="text-xs font-normal text-[var(--color-faint)]">ไม่บังคับ</span>
        )}
      </span>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          type="text"
          value={value}
          onChange={(e) => onChange(formatMoneyTyping(e.target.value))}
          placeholder="0"
          className="num w-full rounded-2xl border border-[var(--color-mid)] bg-white px-4 py-3.5 pr-14 text-lg outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgb(62_207_142/0.35)]"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-faint)]">
          บาท
        </span>
      </div>
      {hint && <span className="block text-xs text-[var(--color-faint)]">{hint}</span>}
    </label>
  )
}

/** Keep digits only, re-format with commas while typing. */
export function formatMoneyTyping(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  return formatBahtAmount(Number(digits))
}

export function parseBahtInput(raw: string): number {
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}
