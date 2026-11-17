import type { TaxYearConfig } from '../config/types'
import { clampSatang, formatBaht, percentOf } from './money'
import type {
  BracketLine,
  CapWarning,
  ChildInput,
  HeadroomItem,
  ParentInput,
  TaxInput,
  TaxResult,
} from './types'

function childAllowed(child: ChildInput, cfg: TaxYearConfig): boolean {
  if (child.age < 0) return false
  if (child.age <= cfg.personal.childMaxAge) return true
  if (
    child.age >= cfg.personal.childStudentMinAge &&
    child.age <= cfg.personal.childStudentMaxAge &&
    child.studying
  ) {
    return true
  }
  return false
}

function childDeductionSatang(child: ChildInput, cfg: TaxYearConfig): number {
  if (!childAllowed(child, cfg)) return 0
  if (child.order >= 2 && child.birthYearBe >= cfg.personal.childSecondPlusBornFromBe) {
    return cfg.personal.childSecondPlusSatang
  }
  return cfg.personal.childBaseSatang
}

function parentAllowed(parent: ParentInput, cfg: TaxYearConfig): boolean {
  return (
    parent.qualifies &&
    parent.age >= cfg.personal.parentMinAge &&
    parent.annualIncomeSatang <= cfg.personal.parentMaxIncomeSatang
  )
}

function computeExpense(input: TaxInput, cfg: TaxYearConfig): number {
  const base = input.salarySatang + input.freelanceSatang
  const raw = percentOf(base, cfg.expense.ratePercent)
  return Math.min(raw, cfg.expense.maxSatang)
}

function computeProgressiveTax(
  netSatang: number,
  cfg: TaxYearConfig,
): { taxSatang: number; lines: BracketLine[] } {
  if (netSatang <= 0) {
    return { taxSatang: 0, lines: [] }
  }

  const lines: BracketLine[] = []
  let remaining = netSatang
  let prevUpTo = 0
  let totalTax = 0

  for (const bracket of cfg.brackets) {
    if (remaining <= 0) break
    const span =
      bracket.upToSatang === Infinity
        ? remaining
        : Math.max(0, bracket.upToSatang - prevUpTo)
    const taxable = Math.min(remaining, span)
    const tax = percentOf(taxable, bracket.ratePercent)
    if (taxable > 0) {
      lines.push({
        fromSatang: prevUpTo + (prevUpTo === 0 ? 0 : 1),
        toSatang: prevUpTo + taxable,
        ratePercent: bracket.ratePercent,
        taxableSatang: taxable,
        taxSatang: tax,
      })
    }
    totalTax += tax
    remaining -= taxable
    prevUpTo = bracket.upToSatang === Infinity ? prevUpTo + taxable : bracket.upToSatang
  }

  return { taxSatang: totalTax, lines }
}

function pushLine(
  lines: TaxResult['deductionLines'],
  id: string,
  label: string,
  amountSatang: number,
) {
  if (amountSatang > 0) {
    lines.push({ id, label, amountSatang })
  }
}

export function calculateTax(input: TaxInput, cfg: TaxYearConfig): TaxResult {
  const warnings: CapWarning[] = []
  const deductionLines: TaxResult['deductionLines'] = []
  const headroom: HeadroomItem[] = []

  const salarySatang = Math.max(0, input.salarySatang)
  const freelanceSatang = Math.max(0, input.freelanceSatang)
  const grossSatang = salarySatang + freelanceSatang
  const expenseSatang = computeExpense(
    { ...input, salarySatang, freelanceSatang },
    cfg,
  )

  // --- Personal & family ---
  let personalTotal = cfg.personal.selfSatang
  pushLine(deductionLines, 'self', 'ลดหย่อนส่วนตัว', cfg.personal.selfSatang)

  if (input.maritalStatus === 'married' && !input.spouseHasIncome) {
    personalTotal += cfg.personal.spouseNoIncomeSatang
    pushLine(deductionLines, 'spouse', 'คู่สมรสไม่มีเงินได้', cfg.personal.spouseNoIncomeSatang)
  }

  let childTotal = 0
  for (const child of input.children) {
    const amt = childDeductionSatang(child, cfg)
    childTotal += amt
  }
  if (childTotal > 0) {
    personalTotal += childTotal
    pushLine(deductionLines, 'children', 'บุตร', childTotal)
  }

  let parentTotal = 0
  for (const parent of input.parents) {
    if (parentAllowed(parent, cfg)) {
      parentTotal += cfg.personal.parentSatang
    }
  }
  if (parentTotal > 0) {
    personalTotal += parentTotal
    pushLine(deductionLines, 'parents', 'บิดามารดา', parentTotal)
  }

  const disabilityCount = Math.max(0, Math.floor(input.disabilityDependents))
  if (disabilityCount > 0) {
    const d = disabilityCount * cfg.personal.disabilitySatang
    personalTotal += d
    pushLine(deductionLines, 'disability', 'อุปการะผู้พิการ', d)
  }

  const pregnancy = clampSatang(input.pregnancySatang, 0, cfg.personal.pregnancyMaxSatang)
  if (input.pregnancySatang > cfg.personal.pregnancyMaxSatang) {
    warnings.push({
      id: 'pregnancy',
      message: `ค่าฝากครรภ์/คลอดส่วนที่เกิน ${formatBaht(cfg.personal.pregnancyMaxSatang)} บาท ใช้สิทธิไม่ได้`,
      excessSatang: input.pregnancySatang - cfg.personal.pregnancyMaxSatang,
    })
  }
  if (pregnancy > 0) {
    personalTotal += pregnancy
    pushLine(deductionLines, 'pregnancy', 'ฝากครรภ์/คลอด', pregnancy)
  }

  // --- Insurance ---
  const sso = clampSatang(input.socialSecuritySatang, 0, cfg.insurance.socialSecurityMaxSatang)
  if (input.socialSecuritySatang > cfg.insurance.socialSecurityMaxSatang) {
    warnings.push({
      id: 'sso',
      message: `ประกันสังคมส่วนที่เกิน ${formatBaht(cfg.insurance.socialSecurityMaxSatang)} บาท ใช้สิทธิไม่ได้`,
      excessSatang: input.socialSecuritySatang - cfg.insurance.socialSecurityMaxSatang,
    })
  }
  if (sso > 0) {
    personalTotal += sso
    pushLine(deductionLines, 'sso', 'ประกันสังคม', sso)
  }
  headroom.push({
    id: 'sso',
    label: 'ประกันสังคม',
    remainingSatang: Math.max(0, cfg.insurance.socialSecurityMaxSatang - sso),
  })

  let life = Math.max(0, input.lifeInsuranceSatang)
  let health = Math.max(0, input.healthInsuranceSatang)
  if (health > cfg.insurance.healthMaxSatang) {
    warnings.push({
      id: 'health',
      message: `ประกันสุขภาพส่วนที่เกิน ${formatBaht(cfg.insurance.healthMaxSatang)} บาท ใช้สิทธิไม่ได้`,
      excessSatang: health - cfg.insurance.healthMaxSatang,
    })
    health = cfg.insurance.healthMaxSatang
  }
  if (life > cfg.insurance.lifeMaxSatang) {
    warnings.push({
      id: 'life',
      message: `ประกันชีวิตส่วนที่เกิน ${formatBaht(cfg.insurance.lifeMaxSatang)} บาท ใช้สิทธิไม่ได้`,
      excessSatang: life - cfg.insurance.lifeMaxSatang,
    })
    life = cfg.insurance.lifeMaxSatang
  }
  const lifeHealthSum = life + health
  if (lifeHealthSum > cfg.insurance.lifeHealthCombinedMaxSatang) {
    const excess = lifeHealthSum - cfg.insurance.lifeHealthCombinedMaxSatang
    warnings.push({
      id: 'lifeHealth',
      message: `ประกันชีวิต+สุขภาพรวมเกินเพดาน ${formatBaht(cfg.insurance.lifeHealthCombinedMaxSatang)} บาท ส่วนเกิน ${formatBaht(excess)} ใช้สิทธิไม่ได้`,
      excessSatang: excess,
    })
    // Prefer keeping health (already capped), trim life
    const allowedLife = Math.max(0, cfg.insurance.lifeHealthCombinedMaxSatang - health)
    life = Math.min(life, allowedLife)
  }
  if (life > 0) {
    personalTotal += life
    pushLine(deductionLines, 'life', 'ประกันชีวิต', life)
  }
  if (health > 0) {
    personalTotal += health
    pushLine(deductionLines, 'health', 'ประกันสุขภาพ', health)
  }
  headroom.push({
    id: 'lifeHealth',
    label: 'ประกันชีวิต + สุขภาพ (เพดานรวม)',
    remainingSatang: Math.max(
      0,
      cfg.insurance.lifeHealthCombinedMaxSatang - life - health,
    ),
  })

  const parentHealth = clampSatang(
    input.parentHealthInsuranceSatang,
    0,
    cfg.insurance.parentHealthMaxSatang,
  )
  if (input.parentHealthInsuranceSatang > cfg.insurance.parentHealthMaxSatang) {
    warnings.push({
      id: 'parentHealth',
      message: `ประกันสุขภาพบิดามารดาส่วนที่เกิน ${formatBaht(cfg.insurance.parentHealthMaxSatang)} บาท ใช้สิทธิไม่ได้`,
      excessSatang: input.parentHealthInsuranceSatang - cfg.insurance.parentHealthMaxSatang,
    })
  }
  if (parentHealth > 0) {
    personalTotal += parentHealth
    pushLine(deductionLines, 'parentHealth', 'ประกันสุขภาพบิดามารดา', parentHealth)
  }

  // --- Retirement group ---
  const rmfCap = Math.min(
    cfg.retirement.rmfMaxSatang,
    percentOf(grossSatang, cfg.retirement.rmfMaxPctOfIncome),
  )
  let rmf = clampSatang(input.rmfSatang, 0, rmfCap)
  if (input.rmfSatang > rmfCap) {
    warnings.push({
      id: 'rmf',
      message: `RMF ส่วนที่เกินเพดาน ${formatBaht(rmfCap)} บาท ใช้สิทธิไม่ได้`,
      excessSatang: input.rmfSatang - rmfCap,
    })
  }

  const pvdCap = Math.min(
    cfg.retirement.pvdMaxSatang,
    percentOf(salarySatang, cfg.retirement.pvdMaxPctOfWage),
  )
  let pvd = clampSatang(input.pvdSatang, 0, pvdCap)
  if (input.pvdSatang > pvdCap) {
    warnings.push({
      id: 'pvd',
      message: `กองทุนสำรองเลี้ยงชีพส่วนที่เกินเพดาน ${formatBaht(pvdCap)} บาท ใช้สิทธิไม่ได้`,
      excessSatang: input.pvdSatang - pvdCap,
    })
  }

  let pension = clampSatang(
    input.pensionInsuranceSatang,
    0,
    cfg.retirement.pensionInsuranceMaxSatang,
  )
  let gpf = clampSatang(input.gpfSatang, 0, cfg.retirement.gpfMaxSatang)
  let nsf = clampSatang(input.nsfSatang, 0, cfg.retirement.nsfMaxSatang)

  let ssf = 0
  if (cfg.retirement.ssfEnabled) {
    const ssfCap = Math.min(
      cfg.retirement.ssfMaxSatang,
      percentOf(grossSatang, cfg.retirement.ssfMaxPctOfIncome),
    )
    ssf = clampSatang(input.ssfSatang, 0, ssfCap)
    if (input.ssfSatang > ssfCap) {
      warnings.push({
        id: 'ssf',
        message: `SSF ส่วนที่เกินเพดาน ${formatBaht(ssfCap)} บาท ใช้สิทธิไม่ได้`,
        excessSatang: input.ssfSatang - ssfCap,
      })
    }
  } else if (input.ssfSatang > 0) {
    warnings.push({
      id: 'ssf',
      message: `ปีภาษี ${cfg.yearBe} ซื้อ SSF ใหม่ลดหย่อนไม่ได้ (สิทธิซื้อถึงปี 2567)`,
      excessSatang: input.ssfSatang,
    })
  }

  const retirementRaw = rmf + pvd + pension + gpf + nsf + ssf
  let retirementAllowed = retirementRaw
  if (retirementRaw > cfg.retirement.groupMaxSatang) {
    const excess = retirementRaw - cfg.retirement.groupMaxSatang
    warnings.push({
      id: 'retirementGroup',
      message: `ส่วนที่เกิน ${formatBaht(excess)} บาท ใช้สิทธิไม่ได้ (เพดานกลุ่มเกษียณ ${formatBaht(cfg.retirement.groupMaxSatang)} บาท)`,
      excessSatang: excess,
    })
    retirementAllowed = cfg.retirement.groupMaxSatang
  }

  if (retirementAllowed > 0) {
    if (retirementRaw > cfg.retirement.groupMaxSatang) {
      pushLine(
        deductionLines,
        'retirement',
        'กลุ่มเกษียณ (RMF/PVD/บำนาญ/กบข./กอช.)',
        retirementAllowed,
      )
    } else {
      if (rmf > 0) pushLine(deductionLines, 'rmf', 'RMF', rmf)
      if (pvd > 0) pushLine(deductionLines, 'pvd', 'กองทุนสำรองเลี้ยงชีพ', pvd)
      if (pension > 0) pushLine(deductionLines, 'pension', 'ประกันบำนาญ', pension)
      if (gpf > 0) pushLine(deductionLines, 'gpf', 'กบข.', gpf)
      if (nsf > 0) pushLine(deductionLines, 'nsf', 'กอช.', nsf)
      if (ssf > 0) pushLine(deductionLines, 'ssf', 'SSF', ssf)
    }
  }
  personalTotal += retirementAllowed

  headroom.push({
    id: 'retirement',
    label: 'กลุ่มเกษียณ (เพดานรวม)',
    remainingSatang: Math.max(0, cfg.retirement.groupMaxSatang - retirementAllowed),
  })

  // --- Thai ESG (outside retirement cap) ---
  let thaiEsg = 0
  if (cfg.thaiEsg.enabled) {
    const esgCap = Math.min(
      cfg.thaiEsg.maxSatang,
      percentOf(grossSatang, cfg.thaiEsg.maxPctOfIncome),
    )
    thaiEsg = clampSatang(input.thaiEsgSatang, 0, esgCap)
    if (input.thaiEsgSatang > esgCap) {
      warnings.push({
        id: 'thaiEsg',
        message: `Thai ESG ส่วนที่เกินเพดาน ${formatBaht(esgCap)} บาท ใช้สิทธิไม่ได้`,
        excessSatang: input.thaiEsgSatang - esgCap,
      })
    }
    if (thaiEsg > 0) {
      personalTotal += thaiEsg
      pushLine(deductionLines, 'thaiEsg', 'Thai ESG', thaiEsg)
    }
    headroom.push({
      id: 'thaiEsg',
      label: 'Thai ESG',
      remainingSatang: Math.max(0, esgCap - thaiEsg),
    })
  }

  // --- Donations (e-Donation gate from 2569) ---
  let donationTotal = 0
  // Cap: 10% of income after expense & deductions (excluding donation itself).
  const donationBase = Math.max(0, grossSatang - expenseSatang - personalTotal)
  const generalCap = percentOf(
    Math.max(donationBase, 0),
    cfg.donation.generalMaxPctOfIncomeAfterExpenseDeduction,
  )

  if (input.donationViaEDonation) {
    let general = clampSatang(input.donationGeneralSatang, 0, generalCap)
    const eduRaw =
      input.donationEducationSportsSatang * cfg.donation.educationSportsMultiplier
    let edu = clampSatang(eduRaw, 0, generalCap)
    // Combined donations also typically share the 10% cap
    if (general + edu > generalCap) {
      const excess = general + edu - generalCap
      warnings.push({
        id: 'donation',
        message: `เงินบริจาคเกินเพดาน 10% ส่วนเกิน ${formatBaht(excess)} บาท ใช้สิทธิไม่ได้`,
        excessSatang: excess,
      })
      // Prefer education (×2 benefit already applied)
      edu = Math.min(edu, generalCap)
      general = Math.min(general, Math.max(0, generalCap - edu))
    }
    donationTotal = general + edu
    if (general > 0) pushLine(deductionLines, 'donationGeneral', 'บริจาคทั่วไป', general)
    if (edu > 0) {
      pushLine(deductionLines, 'donationEdu', 'บริจาคการศึกษา/กีฬา (×2)', edu)
    }
  } else if (
    input.donationGeneralSatang > 0 ||
    input.donationEducationSportsSatang > 0
  ) {
    warnings.push({
      id: 'eDonation',
      message: 'เงินบริจาคที่ไม่ผ่าน e-Donation ไม่นับลดหย่อน (ตั้งแต่ 1 ม.ค. 2569)',
      excessSatang:
        input.donationGeneralSatang + input.donationEducationSportsSatang,
    })
  }
  personalTotal += donationTotal

  // --- Special toggles ---
  for (const spec of cfg.special) {
    if (!spec.enabled) continue
    const raw = Math.max(0, input.specialAmounts[spec.id] ?? 0)
    const amt = clampSatang(raw, 0, spec.maxSatang)
    if (raw > spec.maxSatang) {
      warnings.push({
        id: spec.id,
        message: `${spec.label} ส่วนที่เกิน ${formatBaht(spec.maxSatang)} บาท ใช้สิทธิไม่ได้`,
        excessSatang: raw - spec.maxSatang,
      })
    }
    if (amt > 0) {
      personalTotal += amt
      pushLine(deductionLines, spec.id, spec.label, amt)
    }
  }

  const deductionTotalSatang = personalTotal
  const netIncomeSatang = Math.max(0, grossSatang - expenseSatang - deductionTotalSatang)

  const { taxSatang: progressiveTaxSatang, lines: bracketLines } = computeProgressiveTax(
    netIncomeSatang,
    cfg,
  )

  // Minimum tax ม.48(2): 0.5% of 40(2)–(8); 40(1) excluded
  let minimumTaxSatang = 0
  let minimumTaxApplied = false
  if (
    cfg.minimumTax.enabled &&
    freelanceSatang >= cfg.minimumTax.incomeThresholdSatang
  ) {
    minimumTaxSatang = percentOf(freelanceSatang, cfg.minimumTax.ratePercent)
    if (
      cfg.minimumTax.ignoreIfAtOrBelowSatang > 0 &&
      minimumTaxSatang <= cfg.minimumTax.ignoreIfAtOrBelowSatang
    ) {
      minimumTaxSatang = 0
    }
  }

  let taxSatang = progressiveTaxSatang
  if (minimumTaxSatang > progressiveTaxSatang) {
    taxSatang = minimumTaxSatang
    minimumTaxApplied = true
  }

  const taxWithheldSatang = Math.max(0, input.taxWithheldSatang)
  const diff = taxSatang - taxWithheldSatang
  const netPayableSatang = diff > 0 ? diff : 0
  const refundSatang = diff < 0 ? -diff : 0

  const effectiveRatePercent =
    grossSatang > 0 ? (taxSatang * 10000) / grossSatang / 100 : 0

  return {
    yearBe: cfg.yearBe,
    grossSatang,
    salarySatang,
    freelanceSatang,
    expenseSatang,
    deductionTotalSatang,
    deductionLines,
    netIncomeSatang,
    bracketLines,
    progressiveTaxSatang,
    minimumTaxSatang,
    minimumTaxApplied,
    taxSatang,
    effectiveRatePercent,
    taxWithheldSatang,
    netPayableSatang,
    refundSatang,
    warnings,
    headroom,
  }
}
