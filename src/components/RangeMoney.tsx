import { formatBahtAmount } from '../engine'
import { MoneyInput, parseBahtInput } from './MoneyInput'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  min?: number
  max?: number
  step?: number
}

export function RangeMoney({
  id,
  label,
  value,
  onChange,
  hint,
  min = 0,
  max = 2_000_000,
  step = 5_000,
}: Props) {
  const n = parseBahtInput(value)
  const clamped = Math.min(max, Math.max(min, n))

  return (
    <div className="space-y-2">
      <MoneyInput id={id} label={label} value={value} onChange={onChange} hint={hint} />
      <input
        type="range"
        className="money-range"
        min={min}
        max={max}
        step={step}
        value={clamped || 0}
        aria-label={label}
        onChange={(e) => onChange(formatBahtAmount(Number(e.target.value)))}
      />
      <div className="flex justify-between text-[10px] text-[var(--color-faint)] num">
        <span>{formatBahtAmount(min)}</span>
        <span>{formatBahtAmount(max)}</span>
      </div>
    </div>
  )
}
