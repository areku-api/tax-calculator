import { useEffect, useId, useMemo, useState } from 'react'
import type { TaxYearConfig } from '../config'
import type { WealthTier } from '../characters/tiers'
import type { MaritalStatus, TaxResult } from '../engine'
import { satangToBaht } from '../engine'
import type { CharacterGender } from './WealthCharacter'
import { PowerGauge } from './PowerGauge'
import { WealthCharacter } from './WealthCharacter'

type Props = {
  cfg: TaxYearConfig
  result: TaxResult
  intro?: boolean
  selfGender?: CharacterGender
  maritalStatus?: MaritalStatus
  partnerGender?: CharacterGender | null
  partnerTier?: Extract<WealthTier, 4 | 5> | null
  spouseHasIncome?: boolean
}

function marginalRate(result: TaxResult): number {
  let m = 0
  for (const line of result.bracketLines) {
    if (line.taxableSatang > 0) m = Math.max(m, line.ratePercent)
  }
  if (satangToBaht(result.netIncomeSatang) > 0 && result.taxSatang === 0) return 0
  return m
}

/** Desktop: gauge + character side by side · Mobile: bubble → modal (character inside gauge) */
export function VizBoard({
  cfg,
  result,
  intro = false,
  selfGender = 'female',
  maritalStatus = 'single',
  partnerGender = null,
  partnerTier = null,
  spouseHasIncome = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const rate = useMemo(() => marginalRate(result), [result])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const character = (
    <WealthCharacter
      result={result}
      selfGender={selfGender}
      maritalStatus={maritalStatus}
      partnerGender={partnerGender}
      partnerTier={partnerTier}
      spouseHasIncome={spouseHasIncome}
      forceOrdinary={intro}
    />
  )

  return (
    <>
      <div className={`viz-board ${intro ? 'viz-board--intro' : ''}`}>
        {!intro && (
          <section className="viz-board__left viz-board__gauge-desktop" aria-label="เกจพลังภาษี">
            <PowerGauge cfg={cfg} result={result} />
          </section>
        )}
        <section className="viz-board__right viz-board__char-desktop" aria-label="ตัวละครฐานะ">
          {character}
        </section>
      </div>

      <button
        type="button"
        className="gauge-bubble"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={intro ? 'เปิดตัวละคร' : `เปิดเกจพลังภาษี ขั้น ${rate}%`}
      >
        <span className="gauge-bubble__bolt" aria-hidden>
          ⚡
        </span>
        <span className="gauge-bubble__pct num">{intro ? 'LV.0' : `${rate}%`}</span>
        <span className="gauge-bubble__label">{intro ? 'ตัวละคร' : 'เกจภาษี'}</span>
      </button>

      {open && (
        <div className="gauge-modal" role="presentation">
          <button
            type="button"
            className="gauge-modal__backdrop"
            aria-label="ปิด"
            onClick={() => setOpen(false)}
          />
          <div
            className="gauge-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className="gauge-modal__head">
              <h2 id={titleId} className="gauge-modal__title">
                {intro ? 'ตัวละครของคุณ' : 'เกจพลังภาษี'}
              </h2>
              <button
                type="button"
                className="gauge-modal__close"
                onClick={() => setOpen(false)}
                aria-label="ปิด"
              >
                ✕
              </button>
            </header>
            <div className="gauge-modal__body">
              <div className="gauge-modal__character">{character}</div>
              {!intro && <PowerGauge cfg={cfg} result={result} />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
