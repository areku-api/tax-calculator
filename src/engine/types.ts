import type { Satang } from '../config/types'

export type MaritalStatus = 'single' | 'married'
export type IncomeKind = 'salary' | 'freelance' | 'both'

export type ChildInput = {
  birthYearBe: number
  /** Age at end of tax year, or derived externally */
  age: number
  studying: boolean
  /** Birth order among claimed children (1-based) */
  order: number
}

export type ParentInput = {
  age: number
  annualIncomeSatang: Satang
  qualifies: boolean
}

export type TaxInput = {
  maritalStatus: MaritalStatus
  spouseHasIncome: boolean
  incomeKind: IncomeKind
  /** มาตรา 40(1) assessable income */
  salarySatang: Satang
  /** มาตรา 40(2) assessable income */
  freelanceSatang: Satang
  children: ChildInput[]
  parents: ParentInput[]
  disabilityDependents: number
  pregnancySatang: Satang
  socialSecuritySatang: Satang
  lifeInsuranceSatang: Satang
  healthInsuranceSatang: Satang
  parentHealthInsuranceSatang: Satang
  rmfSatang: Satang
  pvdSatang: Satang
  pensionInsuranceSatang: Satang
  gpfSatang: Satang
  nsfSatang: Satang
  ssfSatang: Satang
  thaiEsgSatang: Satang
  donationViaEDonation: boolean
  donationGeneralSatang: Satang
  donationEducationSportsSatang: Satang
  specialAmounts: Record<string, Satang>
  taxWithheldSatang: Satang
}

export type BracketLine = {
  fromSatang: Satang
  toSatang: Satang
  ratePercent: number
  taxableSatang: Satang
  taxSatang: Satang
}

export type CapWarning = {
  id: string
  message: string
  excessSatang: Satang
}

export type HeadroomItem = {
  id: string
  label: string
  remainingSatang: Satang
}

export type TaxResult = {
  yearBe: number
  grossSatang: Satang
  salarySatang: Satang
  freelanceSatang: Satang
  expenseSatang: Satang
  deductionTotalSatang: Satang
  deductionLines: { id: string; label: string; amountSatang: Satang }[]
  netIncomeSatang: Satang
  bracketLines: BracketLine[]
  progressiveTaxSatang: Satang
  minimumTaxSatang: Satang
  minimumTaxApplied: boolean
  taxSatang: Satang
  effectiveRatePercent: number
  taxWithheldSatang: Satang
  netPayableSatang: Satang
  refundSatang: Satang
  warnings: CapWarning[]
  headroom: HeadroomItem[]
}

export function emptyInput(): TaxInput {
  return {
    maritalStatus: 'single',
    spouseHasIncome: false,
    incomeKind: 'salary',
    salarySatang: 0,
    freelanceSatang: 0,
    children: [],
    parents: [],
    disabilityDependents: 0,
    pregnancySatang: 0,
    socialSecuritySatang: 0,
    lifeInsuranceSatang: 0,
    healthInsuranceSatang: 0,
    parentHealthInsuranceSatang: 0,
    rmfSatang: 0,
    pvdSatang: 0,
    pensionInsuranceSatang: 0,
    gpfSatang: 0,
    nsfSatang: 0,
    ssfSatang: 0,
    thaiEsgSatang: 0,
    donationViaEDonation: false,
    donationGeneralSatang: 0,
    donationEducationSportsSatang: 0,
    specialAmounts: {},
    taxWithheldSatang: 0,
  }
}
