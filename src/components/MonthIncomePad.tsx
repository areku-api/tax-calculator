import { formatMoneyTyping, parseBahtInput } from './MoneyInput'
import { formatBahtAmount } from '../engine'

export const MONTH_LABELS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const

type Props = {
  id: string
  label: string
  values: string[]
  onChange: (values: string[]) => void
  hint?: string
}

export function emptyMonths(): string[] {
  return Array.from({ length: 12 }, () => '')
}

export function sumMonths(values: string[]): number {
  return values.reduce((s, v) => s + parseBahtInput(v), 0)
}

export function fillMonths(amount: string): string[] {
  return Array.from({ length: 12 }, () => amount)
}

export function MonthIncomePad({ id, label, values, onChange, hint }: Props) {
  const months = values.length === 12 ? values : emptyMonths()
  const total = sumMonths(months)

  function setMonth(i: number, raw: string) {
    const next = [...months]
    next[i] = formatMoneyTyping(raw)
    onChange(next)
  }

  function fillAllFromFirst() {
    const seed = months.find((m) => parseBahtInput(m) > 0) ?? ''
    if (!seed) return
    onChange(fillMonths(seed))
  }

  function clearAll() {
    onChange(emptyMonths())
  }

  return (
    <div className="month-pad space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{label}</p>
        <div className="flex gap-2 text-xs">
          <button type="button" className="month-pad__link" onClick={fillAllFromFirst}>
            ใส่เท่ากันทั้งปี
          </button>
          <button type="button" className="month-pad__link" onClick={clearAll}>
            ล้าง
          </button>
        </div>
      </div>

      <div className="month-pad__grid">
        {MONTH_LABELS.map((m, i) => (
          <label key={m} className="month-pad__cell" htmlFor={`${id}-${i}`}>
            <span className="month-pad__mon">{m}</span>
            <input
              id={`${id}-${i}`}
              inputMode="numeric"
              type="text"
              value={months[i] ?? ''}
              onChange={(e) => setMonth(i, e.target.value)}
              placeholder="0"
              className="month-pad__input num"
            />
          </label>
        ))}
      </div>

      <p className="month-pad__sum">
        รวมทั้งปี{' '}
        <strong className="num">{formatBahtAmount(total)}</strong> บาท
      </p>
      {hint && <p className="text-xs text-[var(--color-faint)]">{hint}</p>}
    </div>
  )
}
