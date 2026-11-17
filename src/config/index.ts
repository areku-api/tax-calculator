import { taxYear2569 } from './taxYear2569'
import type { TaxYearConfig } from './types'

export type { TaxYearConfig, TaxBracket, SpecialDeduction, Satang } from './types'
export { taxYear2569 }

const years: Record<number, TaxYearConfig> = {
  2569: taxYear2569,
}

export function getTaxYearConfig(yearBe: number = 2569): TaxYearConfig {
  const cfg = years[yearBe]
  if (!cfg) {
    throw new Error(`ไม่มี config ปีภาษี ${yearBe}`)
  }
  return cfg
}

/** Active MVP year. */
export const ACTIVE_TAX_YEAR = 2569
