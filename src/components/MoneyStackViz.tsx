import { useMemo } from 'react'
import type { TaxResult } from '../engine'
import { formatBaht, satangToBaht } from '../engine'

type Props = {
  result: TaxResult
  /** Highlight label inside stack */
  label?: string
}

function pickUnit(grossBaht: number): number {
  if (grossBaht <= 400_000) return 1_000
  if (grossBaht <= 1_200_000) return 5_000
  if (grossBaht <= 3_000_000) return 10_000
  return 25_000
}

function axisTicks(maxBaht: number): number[] {
  const step = maxBaht <= 400_000 ? 50_000 : maxBaht <= 1_200_000 ? 100_000 : 250_000
  const ticks: number[] = []
  for (let v = 0; v <= maxBaht + 0.1; v += step) ticks.push(v)
  return ticks
}

function formatAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return '0'
}

export function MoneyStackViz({ result, label = 'รายได้' }: Props) {
  const grossBaht = satangToBaht(result.grossSatang)
  const expenseBaht = satangToBaht(result.expenseSatang)
  const deductBaht = satangToBaht(result.deductionTotalSatang)
  const netBaht = satangToBaht(result.netIncomeSatang)

  const unit = pickUnit(Math.max(grossBaht, 100_000))
  const chartMax = Math.max(
    400_000,
    Math.ceil((Math.max(grossBaht, 150_000) * 1.15) / 50_000) * 50_000,
  )

  const { cols, rows, filled, salaryCount, freelanceCount } = useMemo(() => {
    const totalIcons = Math.max(1, Math.round(chartMax / unit))
    const c = 20
    const r = Math.ceil(totalIcons / c)
    const salaryIcons = Math.round(satangToBaht(result.salarySatang) / unit)
    const freelanceIcons = Math.round(satangToBaht(result.freelanceSatang) / unit)
    const fill = Math.min(totalIcons, salaryIcons + freelanceIcons)
    return {
      cols: c,
      rows: r,
      filled: fill,
      salaryCount: Math.min(salaryIcons, fill),
      freelanceCount: Math.max(0, fill - Math.min(salaryIcons, fill)),
    }
  }, [chartMax, unit, result.salarySatang, result.freelanceSatang])

  const fillPct = chartMax > 0 ? Math.min(100, (grossBaht / chartMax) * 100) : 0
  const netPct = chartMax > 0 ? Math.min(100, (netBaht / chartMax) * 100) : 0
  const expensePct = chartMax > 0 ? Math.min(100, (expenseBaht / chartMax) * 100) : 0
  const deductPct = chartMax > 0 ? Math.min(100, (deductBaht / chartMax) * 100) : 0

  const ticks = axisTicks(chartMax)
  const icons = Array.from({ length: cols * rows }, (_, i) => i)

  return (
    <div className="stack-viz">
      <div className="stack-viz__meta">
        <p className="stack-viz__legend">
          <MoneyIcon className="stack-viz__legend-icon is-salary" /> = {formatBaht(unit * 100)} บาท
        </p>
        <p className="stack-viz__axis-label">เงินได้ →</p>
      </div>

      <div className="stack-viz__stage">
        <div className="stack-viz__axis num" aria-hidden>
          {ticks
            .slice()
            .reverse()
            .map((t) => (
              <span key={t} style={{ bottom: `${(t / chartMax) * 100}%` }}>
                {formatAxis(t)}
              </span>
            ))}
        </div>

        <div className="stack-viz__plot">
          {/* Bracket guides */}
          {[150_000, 300_000, 500_000, 1_000_000]
            .filter((v) => v < chartMax)
            .map((v) => (
              <div
                key={v}
                className="stack-viz__guide"
                style={{ bottom: `${(v / chartMax) * 100}%` }}
              />
            ))}

          {/* Fill water for gross */}
          <div className="stack-viz__water" style={{ height: `${fillPct}%` }} />

          {/* Net income marker */}
          {grossBaht > 0 && (
            <div className="stack-viz__net-line" style={{ bottom: `${netPct}%` }}>
              <span>สุทธิ</span>
            </div>
          )}

          {/* Expense / deduction bands from top of stack */}
          {expenseBaht > 0 && (
            <div
              className="stack-viz__band stack-viz__band--expense"
              style={{
                bottom: `${Math.max(0, fillPct - expensePct)}%`,
                height: `${Math.min(expensePct, fillPct)}%`,
              }}
              title="ค่าใช้จ่าย"
            />
          )}
          {deductBaht > 0 && (
            <div
              className="stack-viz__band stack-viz__band--deduct"
              style={{
                bottom: `${Math.max(0, fillPct - expensePct - deductPct)}%`,
                height: `${Math.min(deductPct, Math.max(0, fillPct - expensePct))}%`,
              }}
              title="ลดหย่อน"
            />
          )}

          <div
            className="stack-viz__grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {icons.map((i) => {
              // bottom-left origin fill
              const rowFromTop = Math.floor(i / cols)
              const col = i % cols
              const rowFromBottom = rows - 1 - rowFromTop
              const idx = rowFromBottom * cols + col
              const on = idx < filled
              const kind =
                idx < salaryCount ? 'salary' : idx < salaryCount + freelanceCount ? 'freelance' : ''
              return (
                <span
                  key={i}
                  className={`stack-viz__cell ${on ? `is-on is-${kind}` : ''}`}
                  style={{ transitionDelay: on ? `${Math.min(idx, 40) * 8}ms` : '0ms' }}
                >
                  <MoneyIcon />
                </span>
              )
            })}
          </div>

          {grossBaht > 0 && (
            <div className="stack-viz__label" style={{ bottom: `${Math.max(fillPct * 0.35, 8)}%` }}>
              {label}
              <strong className="num">{formatBaht(result.grossSatang)}</strong>
            </div>
          )}

          {/* Top cap line */}
          {grossBaht > 0 && (
            <div className="stack-viz__cap" style={{ bottom: `${fillPct}%` }} />
          )}
        </div>
      </div>

      <p className="stack-viz__foot num">
        กองเงิน {filled} ชิ้น · สเกล {formatBaht(unit * 100)} / ชิ้น · สูงสุดแกน {formatAxis(chartMax)}
      </p>
    </div>
  )
}

function MoneyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 8" aria-hidden>
      <rect x="0.5" y="0.5" width="11" height="7" rx="1.2" fill="currentColor" opacity="0.92" />
      <circle cx="6" cy="4" r="1.6" fill="var(--color-paper)" opacity="0.85" />
    </svg>
  )
}
