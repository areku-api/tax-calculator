import { resolveWealthTier } from '../characters/tiers'
import type { TaxResult } from '../engine'
import { satangToBaht } from '../engine'

export function marginalRate(result: TaxResult): number {
  let m = 0
  for (const line of result.bracketLines) {
    if (line.taxableSatang > 0) m = Math.max(m, line.ratePercent)
  }
  if (satangToBaht(result.netIncomeSatang) > 0 && result.taxSatang === 0) return 0
  return m
}

/** One-liner for share / copy — no baht amounts */
export function buildShareLine(result: TaxResult): string {
  const info = resolveWealthTier(result)
  const rate = marginalRate(result)
  const tag =
    result.taxSatang === 0
      ? 'ปีนี้รอด'
      : rate >= 30
        ? 'เลเวลท็อป เจ็บมาก'
        : rate >= 20
          ? 'ไฮโซแต่โดนแรง'
          : rate >= 10
            ? 'ปีนี้เริ่มเจ็บ'
            : 'เบา ๆ ยังไหว'

  return `LV.${info.tier} · ขั้น ${rate}% · ${tag}`
}

export function siteUrl(): string {
  if (typeof window === 'undefined') return 'https://donkeebaat.com/'
  return window.location.origin + '/'
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
