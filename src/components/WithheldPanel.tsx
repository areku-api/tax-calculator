import { useEffect, useMemo, useRef, useState } from 'react'
import type { IncomeKind } from '../engine'
import { formatBahtAmount } from '../engine'
import { formatMoneyTyping, MoneyInput, parseBahtInput } from './MoneyInput'
import { MONTH_LABELS } from './MonthIncomePad'

export type WithheldMode = 'none' | 'amount' | 'rate' | 'segments'

type RateBase = 'salary' | 'freelance' | 'both'

type Segment = {
  from: number
  to: number
  rate: string
}

type Props = {
  incomeKind: IncomeKind
  /** Baht per month (length 12) for salary base */
  salaryMonths: number[]
  /** Baht per month (length 12) for freelance base */
  freelanceMonths: number[]
  value: string
  onChange: (value: string) => void
}

const RATE_CHIPS = [3, 5] as const

function defaultBase(kind: IncomeKind): RateBase {
  if (kind === 'salary') return 'salary'
  if (kind === 'freelance') return 'freelance'
  return 'freelance'
}

function monthIncome(months: number[], i: number): number {
  return months[i] ?? 0
}

function baseMonths(
  base: RateBase,
  salaryMonths: number[],
  freelanceMonths: number[],
): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const s = monthIncome(salaryMonths, i)
    const f = monthIncome(freelanceMonths, i)
    if (base === 'salary') return s
    if (base === 'freelance') return f
    return s + f
  })
}

function annualFromMonths(months: number[]): number {
  return months.reduce((a, b) => a + b, 0)
}

function rateOf(seg: Segment): number {
  const n = Number(seg.rate.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function withheldFromFlatRate(months: number[], ratePercent: number): number {
  if (ratePercent <= 0) return 0
  return (annualFromMonths(months) * ratePercent) / 100
}

function withheldFromSegments(months: number[], segments: Segment[]): number {
  let total = 0
  for (let i = 0; i < 12; i++) {
    const seg = segments.find((s) => i >= s.from && i <= s.to)
    if (!seg) continue
    const r = rateOf(seg)
    if (r <= 0) continue
    total += (monthIncome(months, i) * r) / 100
  }
  return total
}

function formatOut(baht: number): string {
  if (baht <= 0) return ''
  return formatMoneyTyping(String(Math.round(baht)))
}

const presetTwoRate = (): Segment[] => [
  { from: 0, to: 7, rate: '3' },
  { from: 8, to: 11, rate: '5' },
]

export function WithheldPanel({
  incomeKind,
  salaryMonths,
  freelanceMonths,
  value,
  onChange,
}: Props) {
  const [mode, setMode] = useState<WithheldMode>(
    parseBahtInput(value) > 0 ? 'amount' : 'none',
  )
  const [base, setBase] = useState<RateBase>(() => defaultBase(incomeKind))
  const [rateChip, setRateChip] = useState<3 | 5 | 'custom'>(5)
  const [customRate, setCustomRate] = useState('5')
  const [segments, setSegments] = useState<Segment[]>(presetTwoRate)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    setBase(defaultBase(incomeKind))
  }, [incomeKind])

  const months = useMemo(
    () => baseMonths(base, salaryMonths, freelanceMonths),
    [base, salaryMonths, freelanceMonths],
  )
  const baseAnnual = annualFromMonths(months)

  const activeRate =
    rateChip === 'custom' ? Number(customRate.replace(/[^\d.]/g, '')) || 0 : rateChip

  const computed = useMemo(() => {
    if (mode === 'none') return 0
    if (mode === 'amount') return parseBahtInput(value)
    if (mode === 'rate') return withheldFromFlatRate(months, activeRate)
    return withheldFromSegments(months, segments)
  }, [mode, value, months, activeRate, segments])

  useEffect(() => {
    if (mode === 'amount' || mode === 'none') return
    const next = formatOut(computed)
    if (next !== value) onChangeRef.current(next)
  }, [mode, computed, value])

  function pickMode(next: WithheldMode) {
    setMode(next)
    if (next === 'none') onChange('')
    if (next === 'rate' || next === 'segments') {
      const baht =
        next === 'rate'
          ? withheldFromFlatRate(months, activeRate)
          : withheldFromSegments(months, segments)
      onChange(formatOut(baht))
    }
  }

  function setSeg(i: number, patch: Partial<Segment>) {
    setSegments((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  function addSeg() {
    if (segments.length >= 3) return
    const last = segments[segments.length - 1]
    const from = Math.min(11, (last?.to ?? -1) + 1)
    setSegments([...segments, { from, to: 11, rate: '5' }])
  }

  function removeSeg(i: number) {
    if (segments.length <= 1) return
    setSegments(segments.filter((_, idx) => idx !== i))
  }

  const showBasePicker = incomeKind === 'both'

  return (
    <div className="withheld space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          ภาษีหัก ณ ที่จ่าย
        </p>
        <p className="text-xs leading-relaxed text-[var(--color-muted)]">
          เงินที่ลูกค้า/นายจ้างหักส่งสรรพากรไปแล้ว · เอามาเทียบกับภาษีทั้งปี
          ว่าได้คืนหรือต้องจ่ายเพิ่ม
        </p>
      </div>

      <div className="withheld__modes">
        {(
          [
            ['none', 'ไม่มี / ไม่รู้'],
            ['amount', 'กรอกยอด'],
            ['rate', 'คิดจาก %'],
            ['segments', 'เรตไม่เท่ากัน'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`withheld__mode ${mode === id ? 'is-on' : ''}`}
            onClick={() => pickMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'amount' && (
        <MoneyInput
          id="withheld-amount"
          label="ยอดที่ถูกหักทั้งปี"
          value={value}
          onChange={onChange}
          optional
          hint="ดูจากใบ 50 ทวิ / สลิปหัก ณ ที่จ่าย"
        />
      )}

      {(mode === 'rate' || mode === 'segments') && (
        <>
          {showBasePicker && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[var(--color-muted)]">
                คิด % จากรายได้ไหน
              </p>
              <div className="withheld__chips">
                {(
                  [
                    ['freelance', 'ฟรีแลนซ์'],
                    ['salary', 'เงินเดือน'],
                    ['both', 'รวมทั้งสอง'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`withheld__chip ${base === id ? 'is-on' : ''}`}
                    onClick={() => setBase(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'rate' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-muted)]">เรตหัก</p>
              <div className="withheld__chips">
                {RATE_CHIPS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`withheld__chip ${rateChip === r ? 'is-on' : ''}`}
                    onClick={() => setRateChip(r)}
                  >
                    {r}%
                  </button>
                ))}
                <button
                  type="button"
                  className={`withheld__chip ${rateChip === 'custom' ? 'is-on' : ''}`}
                  onClick={() => setRateChip('custom')}
                >
                  อื่นๆ
                </button>
              </div>
              {rateChip === 'custom' && (
                <label className="withheld__custom">
                  <span>เรต %</span>
                  <input
                    inputMode="decimal"
                    value={customRate}
                    onChange={(e) =>
                      setCustomRate(e.target.value.replace(/[^\d.]/g, ''))
                    }
                    className="num withheld__custom-input"
                    placeholder="5"
                  />
                </label>
              )}
              <p className="withheld__eq">
                {activeRate > 0 && baseAnnual > 0 ? (
                  <>
                    {activeRate}% × {formatBahtAmount(Math.round(baseAnnual))} ={' '}
                    <strong className="num">
                      {formatBahtAmount(Math.round(computed))}
                    </strong>{' '}
                    บาท
                  </>
                ) : (
                  <span className="text-[var(--color-faint)]">
                    ใส่รายได้ก่อน แล้วค่อยคิด %
                  </span>
                )}
              </p>
            </div>
          )}

          {mode === 'segments' && (
            <div className="space-y-3">
              {segments.map((seg, i) => (
                <div key={i} className="withheld__seg">
                  <p className="withheld__seg-title">ช่วงที่ {i + 1}</p>
                  <div className="withheld__seg-row">
                    <label className="withheld__sel">
                      <span>จาก</span>
                      <select
                        value={seg.from}
                        onChange={(e) =>
                          setSeg(i, {
                            from: Number(e.target.value),
                            to: Math.max(Number(e.target.value), seg.to),
                          })
                        }
                      >
                        {MONTH_LABELS.map((m, mi) => (
                          <option key={m} value={mi}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="withheld__sel">
                      <span>ถึง</span>
                      <select
                        value={seg.to}
                        onChange={(e) =>
                          setSeg(i, {
                            to: Number(e.target.value),
                            from: Math.min(seg.from, Number(e.target.value)),
                          })
                        }
                      >
                        {MONTH_LABELS.map((m, mi) => (
                          <option key={m} value={mi}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="withheld__sel withheld__sel--rate">
                      <span>เรต %</span>
                      <input
                        inputMode="decimal"
                        value={seg.rate}
                        onChange={(e) =>
                          setSeg(i, {
                            rate: e.target.value.replace(/[^\d.]/g, ''),
                          })
                        }
                        className="num"
                      />
                    </label>
                  </div>
                  {segments.length > 1 && (
                    <button
                      type="button"
                      className="month-pad__link"
                      onClick={() => removeSeg(i)}
                    >
                      ลบช่วงนี้
                    </button>
                  )}
                </div>
              ))}

              {segments.length < 3 && (
                <button type="button" className="btn-ghost w-full" onClick={addSeg}>
                  + เพิ่มช่วงเรต
                </button>
              )}

              <p className="withheld__eq">
                หักรวม ≈{' '}
                <strong className="num">
                  {formatBahtAmount(Math.round(computed))}
                </strong>{' '}
                บาท
                {baseAnnual <= 0 && (
                  <span className="text-[var(--color-faint)]">
                    {' '}
                    · ใส่รายได้ก่อนจะคิดได้
                  </span>
                )}
              </p>
              {baseAnnual > 0 && (
                <ul className="withheld__breakdown">
                  {segments.map((seg, i) => {
                    const slice = Array.from(
                      { length: 12 },
                      (_, mi) => (mi >= seg.from && mi <= seg.to ? months[mi] : 0),
                    )
                    const part = withheldFromFlatRate(slice, rateOf(seg))
                    if (part <= 0) return null
                    return (
                      <li key={i}>
                        {MONTH_LABELS[seg.from]}–{MONTH_LABELS[seg.to]} · {rateOf(seg)}%
                        → {formatBahtAmount(Math.round(part))} บาท
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
