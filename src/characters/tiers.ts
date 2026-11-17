import type { TaxResult } from '../engine'
import { satangToBaht } from '../engine'

export type WealthTier = 0 | 1 | 2 | 3 | 4 | 5

export type TierInfo = {
  tier: WealthTier
  title: string
  vibe: string
}

export const TIER_INFO: Record<WealthTier, Omit<TierInfo, 'tier'>> = {
  0: { title: 'บีกินเนอร์', vibe: 'รายได้ดี มีน้อย ยืนตัวเปล่า' },
  1: { title: 'มีกินมีใช้', vibe: 'เริ่มมีข่าว เงินมา ภาษีน้อย' },
  2: { title: 'เริ่มมั่นคง', vibe: 'เริ่มมั่นคง ดำรงอยู่ เงินเริ่มลอย' },
  3: { title: 'อยู่ดีมีสุข', vibe: 'มีใช้สอย จ่ายไม่น้อย พลอยทรัพย์จาง ' },
  4: { title: 'ไฮโซเบา ๆ', vibe: 'การเงินดี มีชัย ไปไหนแล้ว' },
  5: { title: 'รวยมาก', vibe: 'ยังไม่แคล้ว เป็นเศรษฐี ภาษีหลาย' },
}

/** Map income + tax level → cartoon upgrade tier. */
export function resolveWealthTier(result: TaxResult): TierInfo {
  const gross = satangToBaht(result.grossSatang)
  const net = satangToBaht(result.netIncomeSatang)

  let marginal = 0
  for (const line of result.bracketLines) {
    if (line.taxableSatang > 0) marginal = Math.max(marginal, line.ratePercent)
  }
  // If net in exempt band only
  if (net > 0 && result.taxSatang === 0) marginal = 0

  let tier: WealthTier = 0
  if (gross <= 0) tier = 0
  else if (marginal >= 30 || gross >= 3_000_000) tier = 5
  else if (marginal >= 20 || gross >= 1_200_000) tier = 4
  else if (marginal >= 10 || gross >= 600_000) tier = 3
  else if (marginal >= 5 || gross >= 300_000) tier = 2
  else tier = 1

  return { tier, ...TIER_INFO[tier] }
}

/**
 * PixelLab sprites in public/characters/:
 * - tier-0-male.png … tier-5-male.png
 * - tier-0-girl.png … tier-5-girl.png
 */
export function customTierSrc(tier: WealthTier, gender: 'male' | 'female' = 'male'): string {
  const fileGender = gender === 'female' ? 'girl' : 'male'
  return `/characters/tier-${tier}-${fileGender}.png`
}
