import { useEffect, useState } from 'react'
import type { MaritalStatus } from '../engine'
import type { TaxResult } from '../engine'
import { customTierSrc, resolveWealthTier, type WealthTier } from '../characters/tiers'

export type CharacterGender = 'male' | 'female'

type Props = {
  result: TaxResult
  selfGender?: CharacterGender
  maritalStatus?: MaritalStatus
  partnerGender?: CharacterGender | null
  partnerTier?: Extract<WealthTier, 4 | 5> | null
  spouseHasIncome?: boolean
  forceOrdinary?: boolean
  compact?: boolean
}

export function WealthCharacter({
  result,
  selfGender = 'male',
  maritalStatus = 'single',
  partnerGender = null,
  partnerTier = null,
  spouseHasIncome = false,
  forceOrdinary = false,
  compact = false,
}: Props) {
  const resolved = resolveWealthTier(result)
  const tier: WealthTier = forceOrdinary ? 0 : resolved.tier
  const title = forceOrdinary ? 'คนธรรมดา' : resolved.title
  const vibe = forceOrdinary
    ? maritalStatus === 'married'
      ? spouseHasIncome
        ? 'คู่มีรายได้ด้วย เลยสุ่มชุดหรูให้ยืนข้าง ๆ'
        : 'แต่งแล้ว มีใครสักคนยืนข้างกัน'
      : 'ยังไม่ใส่รายได้ เริ่มจากชุดธรรมดาก่อน'
    : resolved.vibe

  const [useCustom, setUseCustom] = useState(false)
  const [failedCustom, setFailedCustom] = useState<Record<string, boolean>>({})
  const showCouple = maritalStatus === 'married'
  const partner: CharacterGender =
    partnerGender ?? (selfGender === 'male' ? 'female' : 'male')
  /** Spouse with income → fancy random LV; else match self */
  const displayPartnerTier: WealthTier =
    spouseHasIncome && partnerTier != null ? partnerTier : tier
  const selfKey = `${selfGender}-${tier}`
  const partnerKey = `${partner}-${displayPartnerTier}`

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setUseCustom(true)
    }
    img.onerror = () => {
      if (!cancelled) setUseCustom(false)
    }
    img.src = customTierSrc(0, selfGender)
    return () => {
      cancelled = true
    }
  }, [selfGender])

  const selfOk = useCustom && !failedCustom[selfKey]
  const partnerOk = useCustom && !failedCustom[partnerKey]
  const showCustomCouple = showCouple && selfOk && partnerOk
  const showCustomSolo = !showCouple && selfOk

  /** Money rain only at top bracket 35% — not yet at 30% / tier 5 alone */
  let marginalRate = 0
  for (const line of result.bracketLines) {
    if (line.taxableSatang > 0) marginalRate = Math.max(marginalRate, line.ratePercent)
  }
  const isRich = !forceOrdinary && marginalRate >= 35

  return (
    <div
      className={`wealth-char wealth-char--pixel ${compact ? 'wealth-char--compact' : ''} ${showCouple ? 'wealth-char--couple' : ''} ${isRich ? 'wealth-char--rich' : ''}`}
    >
      <div
        className={`wealth-char__stage ${showCouple ? 'is-couple' : ''}`}
        key={`${tier}-${selfGender}-${showCouple}-${partner}-${displayPartnerTier}`}
      >
        {isRich && <MoneyRain />}
        {showCustomCouple ? (
          <div className="wealth-char__pair">
            <img
              src={customTierSrc(tier, selfGender)}
              alt={title}
              className="wealth-char__img"
              onError={() => setFailedCustom((m) => ({ ...m, [selfKey]: true }))}
            />
            <img
              src={customTierSrc(displayPartnerTier, partner)}
              alt="คู่สมรส"
              className="wealth-char__img wealth-char__img--partner"
              onError={() => setFailedCustom((m) => ({ ...m, [partnerKey]: true }))}
            />
          </div>
        ) : showCustomSolo ? (
          <img
            src={customTierSrc(tier, selfGender)}
            alt={title}
            className="wealth-char__img"
            onError={() => setFailedCustom((m) => ({ ...m, [selfKey]: true }))}
          />
        ) : showCouple ? (
          <CoupleSvg
            tier={tier}
            partnerTier={displayPartnerTier}
            selfGender={selfGender}
            partner={partner}
          />
        ) : (
          <CartoonSvg tier={tier} gender={selfGender} />
        )}
        <div className="wealth-char__aura" data-tier={tier} aria-hidden />
      </div>

      <div className="wealth-char__meta">
        <p className="wealth-char__eyebrow">
          เลเวล {tier} · {selfGender === 'female' ? 'ผู้หญิง' : 'ผู้ชาย'}
          {showCouple ? ' · มีคู่' : ''}
        </p>
        <h3 className="wealth-char__title">{title}</h3>
        <p className="wealth-char__vibe">{vibe}</p>
        {showCouple && partnerGender && (
          <p className="wealth-char__partner-tag">
            คู่ข้าง ๆ
            {spouseHasIncome ? ` · มีรายได้` : ' · ไม่มีรายได้'}
          </p>
        )}
        <TierDots current={tier} />
      </div>
    </div>
  )
}

function TierDots({ current }: { current: WealthTier }) {
  return (
    <ol className="wealth-char__dots" aria-label="ระดับฐานะ">
      {([0, 1, 2, 3, 4, 5] as WealthTier[]).map((t) => (
        <li key={t} className={t <= current ? 'is-on' : ''} title={`LV.${t}`} />
      ))}
    </ol>
  )
}

const MONEY_DROPS = [
  { left: '8%', delay: '0s', dur: '2.4s', size: '0.95rem' },
  { left: '18%', delay: '0.4s', dur: '2.8s', size: '0.75rem' },
  { left: '28%', delay: '1.1s', dur: '2.2s', size: '1.05rem' },
  { left: '38%', delay: '0.2s', dur: '3s', size: '0.85rem' },
  { left: '48%', delay: '0.7s', dur: '2.5s', size: '1rem' },
  { left: '58%', delay: '1.4s', dur: '2.7s', size: '0.7rem' },
  { left: '68%', delay: '0.55s', dur: '2.3s', size: '0.9rem' },
  { left: '78%', delay: '1.8s', dur: '2.9s', size: '1.1rem' },
  { left: '88%', delay: '0.9s', dur: '2.6s', size: '0.8rem' },
  { left: '14%', delay: '2.1s', dur: '2.4s', size: '0.7rem' },
  { left: '72%', delay: '1.6s', dur: '3.1s', size: '0.95rem' },
  { left: '42%', delay: '2.4s', dur: '2.2s', size: '0.75rem' },
] as const

function MoneyRain() {
  return (
    <div className="money-rain" aria-hidden>
      {MONEY_DROPS.map((d, i) => (
        <span
          key={i}
          className="money-rain__coin"
          style={{
            left: d.left,
            animationDelay: d.delay,
            animationDuration: d.dur,
            fontSize: d.size,
          }}
        >
          ฿
        </span>
      ))}
    </div>
  )
}

function CoupleSvg({
  tier,
  partnerTier,
  selfGender,
  partner,
}: {
  tier: WealthTier
  partnerTier: WealthTier
  selfGender: CharacterGender
  partner: CharacterGender
}) {
  return (
    <svg viewBox="0 0 280 260" className="wealth-char__svg" role="img" aria-label="ตัวละครคู่สมรส">
      <ellipse cx="140" cy="242" rx="78" ry="8" fill="#C9B59C" opacity="0.35" />
      <g transform="translate(-8 0)">
        <CartoonSvg tier={tier} gender={selfGender} embedded />
      </g>
      <g transform="translate(78 8) scale(0.92)">
        <CartoonSvg tier={partnerTier} gender={partner} embedded />
      </g>
    </svg>
  )
}

type CartoonProps = {
  tier: WealthTier
  gender: CharacterGender
  embedded?: boolean
}

function malePalette(tier: WealthTier) {
  const shirts = ['#D9CFC7', '#C9B59C', '#A8947A', '#8A7560', '#6B5A48', '#2C2824']
  return {
    shirt: shirts[tier],
    pants: tier >= 4 ? '#2C2824' : '#7A6E63',
    hair: tier >= 4 ? '#2C2824' : '#5C4A3A',
    shoe: tier >= 5 ? '#C9B59C' : '#5C4A3A',
  }
}

function femalePalette(tier: WealthTier) {
  const dresses = ['#EFE9E3', '#D9CFC7', '#C9B59C', '#A8947A', '#8A7560', '#6B5A48']
  return {
    dress: dresses[tier],
    accent: tier >= 4 ? '#2C2824' : '#C9B59C',
    hair: tier >= 4 ? '#2C2824' : '#3D2B22',
    shoe: tier >= 3 ? '#2C2824' : '#8A7560',
  }
}

function CartoonSvg({ tier, gender, embedded = false }: CartoonProps) {
  const skin = '#E8D5C4'
  const isFemale = gender === 'female'
  const body = isFemale ? <FemaleBody tier={tier} skin={skin} /> : <MaleBody tier={tier} skin={skin} />

  if (embedded) return <g>{body}</g>

  return (
    <svg
      viewBox="0 0 200 260"
      className="wealth-char__svg"
      role="img"
      aria-label={`ตัวละคร${isFemale ? 'ผู้หญิง' : 'ผู้ชาย'} เลเวล ${tier}`}
    >
      {body}
    </svg>
  )
}

function MaleBody({ tier, skin }: { tier: WealthTier; skin: string }) {
  const p = malePalette(tier)
  return (
    <>
      <ellipse cx="100" cy="242" rx="48" ry="8" fill="#C9B59C" opacity="0.35" />
      <rect x="78" y="168" width="18" height="52" rx="8" fill={p.pants} />
      <rect x="104" y="168" width="18" height="52" rx="8" fill={p.pants} />
      <ellipse cx="87" cy="222" rx="14" ry="7" fill={p.shoe} />
      <ellipse cx="113" cy="222" rx="14" ry="7" fill={p.shoe} />
      <rect x="70" y="108" width="60" height="68" rx="18" fill={p.shirt} />
      {tier >= 3 && (
        <path d="M70 120 Q100 135 130 120" stroke="#EFE9E3" strokeWidth="3" fill="none" opacity="0.5" />
      )}
      {tier >= 4 && <rect x="62" y="108" width="16" height="58" rx="6" fill="#5C4A3A" opacity="0.85" />}
      {tier >= 5 && (
        <>
          <rect x="122" y="108" width="16" height="58" rx="6" fill="#5C4A3A" opacity="0.85" />
          <circle cx="148" cy="130" r="10" fill="#C9B59C" stroke="#8A7560" strokeWidth="2" />
          <text x="148" y="134" textAnchor="middle" fontSize="10" fill="#2C2824">
            ฿
          </text>
        </>
      )}
      <rect x="52" y="112" width="18" height="46" rx="9" fill={skin} />
      <rect x="130" y="112" width="18" height="46" rx="9" fill={skin} />
      <circle cx="100" cy="70" r="36" fill={skin} />
      <path
        d={
          tier >= 4
            ? 'M64 70 Q64 34 100 32 Q136 34 136 70 Q130 48 100 46 Q70 48 64 70Z'
            : 'M66 72 Q68 38 100 34 Q132 38 134 72 Q126 52 100 50 Q74 52 66 72Z'
        }
        fill={p.hair}
      />
      <circle cx="88" cy="72" r="3.2" fill="#2C2824" />
      <circle cx="112" cy="72" r="3.2" fill="#2C2824" />
      <path
        d={tier >= 3 ? 'M90 86 Q100 94 110 86' : 'M92 86 Q100 90 108 86'}
        stroke="#2C2824"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="118" cy="80" r="5" fill="#E8A090" opacity="0.45" />
      {tier >= 2 && tier < 4 && (
        <rect x="128" y="150" width="28" height="22" rx="4" fill="#EFE9E3" stroke="#C9B59C" strokeWidth="2" />
      )}
      {tier >= 4 && <rect x="78" y="58" width="44" height="12" rx="2" fill="#2C2824" opacity="0.75" />}
      {tier >= 5 && (
        <>
          <circle cx="72" cy="48" r="3" fill="#C9B59C" />
          <circle cx="128" cy="44" r="2.5" fill="#C9B59C" />
        </>
      )}
    </>
  )
}

function FemaleBody({ tier, skin }: { tier: WealthTier; skin: string }) {
  const p = femalePalette(tier)
  return (
    <>
      <ellipse cx="100" cy="242" rx="48" ry="8" fill="#C9B59C" opacity="0.35" />
      {/* legs / dress hem */}
      {tier <= 1 ? (
        <>
          <path d="M70 125 L100 210 L130 125 Z" fill={p.dress} />
          <rect x="82" y="175" width="14" height="42" rx="7" fill={skin} opacity="0.35" />
          <rect x="104" y="175" width="14" height="42" rx="7" fill={skin} opacity="0.35" />
        </>
      ) : tier <= 3 ? (
        <>
          <rect x="78" y="120" width="44" height="55" rx="12" fill={p.dress} />
          <path d="M74 165 L100 220 L126 165 Z" fill={p.dress} />
          <rect x="84" y="188" width="12" height="30" rx="6" fill={skin} opacity="0.4" />
          <rect x="104" y="188" width="12" height="30" rx="6" fill={skin} opacity="0.4" />
        </>
      ) : (
        <>
          <rect x="74" y="112" width="52" height="62" rx="14" fill={p.dress} />
          <rect x="70" y="112" width="14" height="70" rx="5" fill={p.accent} opacity="0.9" />
          <rect x="116" y="112" width="14" height="70" rx="5" fill={p.accent} opacity="0.9" />
          <rect x="84" y="170" width="14" height="48" rx="7" fill="#2C2824" />
          <rect x="102" y="170" width="14" height="48" rx="7" fill="#2C2824" />
        </>
      )}
      <ellipse cx="88" cy="222" rx="13" ry="6" fill={p.shoe} />
      <ellipse cx="112" cy="222" rx="13" ry="6" fill={p.shoe} />

      {/* torso top for higher tiers already in dress; arms */}
      <rect x="52" y="112" width="17" height="44" rx="9" fill={skin} />
      <rect x="131" y="112" width="17" height="44" rx="9" fill={skin} />

      {/* bag / clutch by tier */}
      {tier >= 2 && tier < 5 && (
        <rect x="138" y="148" width="22" height="28" rx="5" fill="#EFE9E3" stroke={p.accent} strokeWidth="2" />
      )}
      {tier >= 5 && (
        <g>
          <rect x="140" y="145" width="24" height="18" rx="4" fill="#C9B59C" stroke="#2C2824" strokeWidth="1.5" />
          <circle cx="60" cy="130" r="9" fill="#C9B59C" stroke="#8A7560" strokeWidth="2" />
          <text x="60" y="134" textAnchor="middle" fontSize="9" fill="#2C2824">
            ฿
          </text>
        </g>
      )}

      {/* head */}
      <circle cx="100" cy="70" r="36" fill={skin} />
      <path
        d="M62 78 Q66 26 100 24 Q134 26 138 78 Q132 48 100 46 Q68 48 62 78Z"
        fill={p.hair}
      />
      <path d="M64 88 Q56 125 72 150" stroke={p.hair} strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M136 88 Q144 125 128 150" stroke={p.hair} strokeWidth="11" fill="none" strokeLinecap="round" />
      {tier >= 3 && (
        <path d="M70 55 Q100 42 130 55" stroke={p.hair} strokeWidth="8" fill="none" strokeLinecap="round" />
      )}

      <circle cx="88" cy="72" r="3.2" fill="#2C2824" />
      <circle cx="112" cy="72" r="3.2" fill="#2C2824" />
      <path d="M90 86 Q100 95 110 86" stroke="#2C2824" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="120" cy="80" r="5" fill="#E8A090" opacity="0.5" />

      {/* sunglasses luxury */}
      {tier >= 4 && (
        <g>
          <rect x="78" y="66" width="18" height="10" rx="2" fill="#2C2824" opacity="0.85" />
          <rect x="104" y="66" width="18" height="10" rx="2" fill="#2C2824" opacity="0.85" />
          <path d="M96 71 H104" stroke="#2C2824" strokeWidth="2" />
        </g>
      )}
      {tier >= 5 && (
        <>
          <circle cx="72" cy="46" r="3" fill="#C9B59C" />
          <circle cx="130" cy="42" r="2.5" fill="#D9CFC7" />
          <circle cx="140" cy="58" r="2" fill="#C9B59C" />
        </>
      )}
    </>
  )
}
