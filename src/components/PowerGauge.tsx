import { useMemo, type CSSProperties } from 'react'
import type { TaxYearConfig } from '../config'
import type { TaxResult } from '../engine'
import { formatBaht, satangToBaht } from '../engine'

const toSatang = (baht: number) => Math.round(baht * 100)

/** RPG-style hue per tax rate — cool → hot as progress climbs */
const RATE_HUE: Record<number, string> = {
  0: '#5ecf8b',
  5: '#7ddf6a',
  10: '#c6e04a',
  15: '#f0c93a',
  20: '#f0a03a',
  25: '#ef7a45',
  30: '#e84d5b',
  35: '#d63b8a',
}

type Level = {
  ratePercent: number
  minBaht: number
  maxBaht: number
  spanBaht: number
  filledBaht: number
  taxBaht: number
  progress: number
  unlocked: boolean
  current: boolean
  label: string
  color: string
}

function buildLevels(cfg: TaxYearConfig, result: TaxResult): Level[] {
  const netBaht = satangToBaht(result.netIncomeSatang)
  const taxByRate = new Map(
    result.bracketLines.map((l) => [l.ratePercent, satangToBaht(l.taxSatang)]),
  )
  let prev = 0
  const levels: Level[] = []

  for (const br of cfg.brackets) {
    const maxBaht =
      br.upToSatang === Infinity
        ? Math.max(netBaht, prev + 1_000_000)
        : satangToBaht(br.upToSatang)
    const spanBaht = Math.max(1, maxBaht - prev)
    const filledBaht = Math.max(0, Math.min(netBaht, maxBaht) - prev)
    levels.push({
      ratePercent: br.ratePercent,
      minBaht: prev,
      maxBaht,
      spanBaht,
      filledBaht,
      taxBaht: taxByRate.get(br.ratePercent) ?? 0,
      progress: Math.min(1, filledBaht / spanBaht),
      unlocked: filledBaht > 0,
      current: netBaht > prev && (br.upToSatang === Infinity || netBaht <= maxBaht),
      label: br.ratePercent === 0 ? 'ยังไม่เสีย' : `ขั้น ${br.ratePercent}%`,
      color: RATE_HUE[br.ratePercent] ?? '#7ddf6a',
    })
    prev = maxBaht
    if (br.upToSatang === Infinity) break
  }
  return levels
}

function shortRange(min: number, max: number, open?: boolean): string {
  const fmt = (n: number) => n.toLocaleString('en-US')
  if (open) return `>${fmt(min)}`
  return `${fmt(min)}–${fmt(max)}`
}

type Props = {
  cfg: TaxYearConfig
  result: TaxResult
  gaugeOnly?: boolean
}

export function PowerGauge({ cfg, result, gaugeOnly = false }: Props) {
  const levels = useMemo(() => buildLevels(cfg, result), [cfg, result])
  const current = levels.find((l) => l.current) ?? levels[0]
  const marginal = current?.ratePercent ?? 0
  const effective = result.effectiveRatePercent
  const gaugePct = Math.min(100, (marginal / 35) * 100)
  const accent = current?.color ?? RATE_HUE[0]
  const xpPct = Math.round((current?.progress ?? 0) * 100)

  const segmentStyle = useMemo(() => {
    // rainbow track: fill each unlocked segment solid, current partial
    const stops: string[] = []
    const n = levels.length
    levels.forEach((lv, i) => {
      const a = (i / n) * 100
      const b = ((i + 1) / n) * 100
      if (lv.progress <= 0) {
        stops.push(`#2a3340 ${a}%`, `#2a3340 ${b}%`)
      } else if (lv.progress >= 1) {
        stops.push(`${lv.color} ${a}%`, `${lv.color} ${b}%`)
      } else {
        const mid = a + (b - a) * lv.progress
        stops.push(`${lv.color} ${a}%`, `${lv.color} ${mid}%`, `#2a3340 ${mid}%`, `#2a3340 ${b}%`)
      }
    })
    return { background: `linear-gradient(90deg, ${stops.join(', ')})` } as CSSProperties
  }, [levels])

  return (
    <div
      className={`power-gauge ${gaugeOnly ? 'power-gauge--solo' : ''}`}
      style={{ '--gauge-accent': accent, '--gauge': `${gaugePct}%` } as CSSProperties}
    >
      <p className="power-gauge__eyebrow">ภาษี</p>

      <div
        className="power-gauge__dial"
        role="img"
        aria-label={`อัตราขั้นนี้ ${marginal}%`}
      >
        <div className="power-gauge__ring">
          <div className="power-gauge__core">
            <span className="power-gauge__label">ขั้นที่อยู่ตอนนี้</span>
            <strong className="power-gauge__num num">{marginal}%</strong>
            <span className="power-gauge__sub">เฉลี่ยจริง ~{effective.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="power-gauge__xp" aria-label={`ความคืบหน้าขั้นนี้ ${xpPct}%`}>
        <div className="power-gauge__xp-head">
          <span>เต็มขั้นนี้ไปแล้ว</span>
          <strong className="num">{xpPct}%</strong>
        </div>
        <div className="power-gauge__xp-track">
          <i style={{ width: `${xpPct}%`, background: accent }} />
        </div>
        <div className="power-gauge__segments" style={segmentStyle} aria-hidden />
        <div className="power-gauge__seg-labels" aria-hidden>
          {levels.map((lv) => (
            <span
              key={lv.ratePercent}
              className={lv.unlocked ? 'is-on' : ''}
              style={{ color: lv.unlocked ? lv.color : undefined }}
            >
              {lv.ratePercent}
            </span>
          ))}
        </div>
      </div>

      <div className="power-gauge__stats">
        <div>
          <span>เหลือคิดภาษี</span>
          <strong className="num">{formatBaht(result.netIncomeSatang)}</strong>
        </div>
        <div>
          <span>ภาษีที่ประมาณได้</span>
          <strong className="num power-gauge__tax">{formatBaht(result.taxSatang)}</strong>
        </div>
      </div>

      {!gaugeOnly && (
        <ol className="power-gauge__list">
          {levels.map((lv, i) => (
            <li
              key={`${lv.ratePercent}-${lv.minBaht}`}
              className={`level-row ${lv.unlocked ? 'is-on' : ''} ${lv.current ? 'is-now' : ''}`}
              style={
                {
                  animationDelay: `${i * 40}ms`,
                  '--lv-color': lv.color,
                } as CSSProperties
              }
            >
              <div className="level-row__badge num">{lv.ratePercent}%</div>
              <div className="level-row__body">
                <div className="level-row__top">
                  <span className="level-row__name">{lv.label}</span>
                  <span className="level-row__range num">
                    {shortRange(lv.minBaht, lv.maxBaht, lv.ratePercent === 35)}
                  </span>
                </div>
                <div className="level-row__track" aria-hidden>
                  <i style={{ width: `${lv.progress * 100}%`, background: lv.color }} />
                </div>
                <div className="level-row__bottom">
                  <span className="num">
                    {lv.unlocked
                      ? `อยู่ในขั้นนี้ ${formatBaht(toSatang(lv.filledBaht))}`
                      : 'ยังไม่ถึงขั้นนี้'}
                  </span>
                  <span className={`num level-row__tax ${lv.taxBaht > 0 ? 'has-tax' : ''}`}>
                    {lv.taxBaht > 0 ? `+${formatBaht(toSatang(lv.taxBaht))}` : '0'}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
