import type { Satang } from '../config/types'

/** Convert baht (may be float from UI) to satang integer. */
export function bahtToSatang(baht: number): Satang {
  if (!Number.isFinite(baht) || baht <= 0) return 0
  return Math.round(baht * 100)
}

export function satangToBaht(satang: Satang): number {
  return satang / 100
}

/** Percent of amount in satang — integer math, truncate toward zero. */
export function percentOf(amountSatang: Satang, ratePercent: number): Satang {
  if (amountSatang <= 0 || ratePercent <= 0) return 0
  // Support 0.5% via (amount * 50) / 10000 when rate has decimals
  if (Number.isInteger(ratePercent)) {
    return Math.trunc((amountSatang * ratePercent) / 100)
  }
  const scaled = Math.round(ratePercent * 100) // 0.5 → 50
  return Math.trunc((amountSatang * scaled) / 10_000)
}

export function clampSatang(value: Satang, min: Satang, max: Satang): Satang {
  return Math.min(Math.max(value, min), max)
}

const bahtFmt = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

/** Format baht amount with thousand commas: 60000 → "60,000" */
export function formatBahtAmount(baht: number): string {
  if (!Number.isFinite(baht)) return '0'
  return bahtFmt.format(Math.round(baht))
}

export function formatBaht(satang: Satang, opts?: { digits?: number }): string {
  if (opts?.digits) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: opts.digits,
      maximumFractionDigits: opts.digits,
    }).format(satangToBaht(satang))
  }
  return formatBahtAmount(satangToBaht(satang))
}

export function formatBahtWithUnit(satang: Satang): string {
  return `${formatBaht(satang)} บาท`
}
