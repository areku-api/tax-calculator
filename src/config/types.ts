/** Money stored as integer satang (1 baht = 100 satang). */
export type Satang = number

export type TaxBracket = {
  /** Inclusive upper bound in satang; use Infinity for open top. */
  upToSatang: number
  /** Percent, e.g. 5 for 5%. */
  ratePercent: number
}

export type SpecialDeduction = {
  id: string
  label: string
  maxSatang: Satang
  enabled: boolean
  hint?: string
}

export type TaxYearConfig = {
  yearBe: number
  label: string
  disclaimer: string
  rdUrl: string
  brackets: TaxBracket[]
  expense: {
    ratePercent: number
    maxSatang: Satang
    /** 40(1)+40(2) share one ceiling */
    sharedAcross401And402: boolean
  }
  personal: {
    selfSatang: Satang
    spouseNoIncomeSatang: Satang
    childBaseSatang: Satang
    /** Extra for 2nd+ child born from this BE year */
    childSecondPlusSatang: Satang
    childSecondPlusBornFromBe: number
    childMaxAge: number
    childStudentMinAge: number
    childStudentMaxAge: number
    parentSatang: Satang
    parentMaxIncomeSatang: Satang
    parentMinAge: number
    disabilitySatang: Satang
    pregnancyMaxSatang: Satang
  }
  insurance: {
    socialSecurityMaxSatang: Satang
    lifeMaxSatang: Satang
    healthMaxSatang: Satang
    lifeHealthCombinedMaxSatang: Satang
    parentHealthMaxSatang: Satang
  }
  retirement: {
    groupMaxSatang: Satang
    rmfMaxPctOfIncome: number
    rmfMaxSatang: Satang
    pvdMaxPctOfWage: number
    pvdMaxSatang: Satang
    pensionInsuranceMaxSatang: Satang
    gpfMaxSatang: Satang
    nsfMaxSatang: Satang
    /** SSF new purchases — disabled for 2568+ */
    ssfEnabled: boolean
    ssfMaxPctOfIncome: number
    ssfMaxSatang: Satang
  }
  thaiEsg: {
    enabled: boolean
    maxPctOfIncome: number
    maxSatang: Satang
    outsideRetirementCap: boolean
    tip: string
  }
  donation: {
    requiresEDonation: boolean
    generalMaxPctOfIncomeAfterExpenseDeduction: number
    educationSportsMultiplier: number
  }
  minimumTax: {
    /** Applies when 40(2)–(8) assessable income ≥ threshold */
    enabled: boolean
    incomeThresholdSatang: Satang
    ratePercent: number
    /** If computed min-tax ≤ this, do not force (common practice); 0 = always compare */
    ignoreIfAtOrBelowSatang: Satang
  }
  special: SpecialDeduction[]
}
