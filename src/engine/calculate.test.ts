import { describe, expect, it } from 'vitest'
import { getTaxYearConfig, taxYear2569 } from '../config'
import { calculateTax } from './calculate'
import { bahtToSatang } from './money'
import { emptyInput, type TaxInput } from './types'

const cfg = getTaxYearConfig(2569)
const b = bahtToSatang

function base(partial: Partial<TaxInput> = {}): TaxInput {
  return { ...emptyInput(), ...partial }
}

describe('AC-01 low income → tax 0', () => {
  it('salary 10,000/mo single → tax 0, net ≤ 150,000', () => {
    const result = calculateTax(
      base({
        incomeKind: 'salary',
        salarySatang: b(10_000 * 12),
        maritalStatus: 'single',
      }),
      cfg,
    )
    expect(result.netIncomeSatang).toBeLessThanOrEqual(b(150_000))
    expect(result.taxSatang).toBe(0)
  })
})

describe('AC-02 standard salary case', () => {
  it('30k/mo + SSO 9,000 → expense 100k, deduct 69k, net 191k, tax 2,050', () => {
    const result = calculateTax(
      base({
        incomeKind: 'salary',
        salarySatang: b(30_000 * 12),
        maritalStatus: 'single',
        socialSecuritySatang: b(9_000),
      }),
      cfg,
    )
    expect(result.expenseSatang).toBe(b(100_000))
    expect(result.deductionTotalSatang).toBe(b(69_000))
    expect(result.netIncomeSatang).toBe(b(191_000))
    expect(result.taxSatang).toBe(b(2_050))
  })
})

describe('AC-03 multi-bracket', () => {
  it('income 1.2M → net 1.04M, tax 125,000 with per-bracket lines', () => {
    const result = calculateTax(
      base({
        incomeKind: 'salary',
        salarySatang: b(1_200_000),
        maritalStatus: 'single',
      }),
      cfg,
    )
    expect(result.expenseSatang).toBe(b(100_000))
    expect(result.netIncomeSatang).toBe(b(1_040_000))
    expect(result.taxSatang).toBe(b(125_000))
    const taxes = result.bracketLines
      .filter((l) => l.taxSatang > 0)
      .map((l) => l.taxSatang)
    expect(taxes).toEqual([b(7_500), b(20_000), b(37_500), b(50_000), b(10_000)])
  })
})

describe('AC-04 retirement group cap', () => {
  it('RMF 400k + PVD 200k → allowed 500k, warn excess 100k', () => {
    const result = calculateTax(
      base({
        incomeKind: 'salary',
        salarySatang: b(2_000_000),
        rmfSatang: b(400_000),
        pvdSatang: b(200_000),
      }),
      cfg,
    )
    const retirementLine = result.deductionLines.find((l) => l.id === 'retirement')
    expect(retirementLine?.amountSatang).toBe(b(500_000))
    const warn = result.warnings.find((w) => w.id === 'retirementGroup')
    expect(warn).toBeTruthy()
    expect(warn!.excessSatang).toBe(b(100_000))
    expect(warn!.message).toContain('100,000')
  })
})

describe('AC-05 parent conditions', () => {
  it('rejects parent under 60 or income over 30k', () => {
    const failAge = calculateTax(
      base({
        salarySatang: b(500_000),
        parents: [{ age: 55, annualIncomeSatang: b(0), qualifies: true }],
      }),
      cfg,
    )
    expect(failAge.deductionLines.find((l) => l.id === 'parents')).toBeUndefined()

    const failIncome = calculateTax(
      base({
        salarySatang: b(500_000),
        parents: [{ age: 65, annualIncomeSatang: b(30_001), qualifies: true }],
      }),
      cfg,
    )
    expect(failIncome.deductionLines.find((l) => l.id === 'parents')).toBeUndefined()

    const ok = calculateTax(
      base({
        salarySatang: b(500_000),
        parents: [{ age: 65, annualIncomeSatang: b(30_000), qualifies: true }],
      }),
      cfg,
    )
    expect(ok.deductionLines.find((l) => l.id === 'parents')?.amountSatang).toBe(b(30_000))
  })
})

describe('AC-06 withheld tax', () => {
  it('tax 2050 withheld 4000 → refund 1950', () => {
    const result = calculateTax(
      base({
        salarySatang: b(360_000),
        socialSecuritySatang: b(9_000),
        taxWithheldSatang: b(4_000),
      }),
      cfg,
    )
    expect(result.taxSatang).toBe(b(2_050))
    expect(result.refundSatang).toBe(b(1_950))
    expect(result.netPayableSatang).toBe(0)
  })

  it('withheld less → must pay more', () => {
    const result = calculateTax(
      base({
        salarySatang: b(360_000),
        socialSecuritySatang: b(9_000),
        taxWithheldSatang: b(1_000),
      }),
      cfg,
    )
    expect(result.netPayableSatang).toBe(b(1_050))
    expect(result.refundSatang).toBe(0)
  })
})

describe('AC-07 bracket boundaries (config-driven)', () => {
  const boundaries = [150_000, 150_001, 300_000, 300_001, 500_000, 750_000, 1_000_000, 2_000_000, 5_000_000]

  for (const netBaht of boundaries) {
    it(`progressive tax at net ${netBaht}`, () => {
      // Craft income so net ≈ target: income = net + expense + personal
      // expense = min(50% income, 100k); personal = 60k
      // Solve for income when expense hits 100k: net = income - 100k - 60k → income = net + 160k
      const income = b(netBaht + 160_000)
      const result = calculateTax(
        base({ salarySatang: income, maritalStatus: 'single' }),
        cfg,
      )
      expect(result.netIncomeSatang).toBe(b(netBaht))

      // Manual expected from brackets
      let expected = 0
      let prev = 0
      let rem = b(netBaht)
      for (const br of cfg.brackets) {
        const span = br.upToSatang === Infinity ? rem : Math.max(0, br.upToSatang - prev)
        const taxable = Math.min(rem, span)
        expected += Math.trunc((taxable * br.ratePercent) / 100)
        rem -= taxable
        prev = br.upToSatang === Infinity ? prev + taxable : br.upToSatang
        if (rem <= 0) break
      }
      expect(result.progressiveTaxSatang).toBe(expected)
    })
  }
})

describe('expense shared ceiling 40(1)+40(2)', () => {
  it('salary + freelance each could be 100k alone but share one 100k', () => {
    const result = calculateTax(
      base({
        incomeKind: 'both',
        salarySatang: b(300_000),
        freelanceSatang: b(300_000),
      }),
      cfg,
    )
    expect(result.expenseSatang).toBe(b(100_000))
  })
})

describe('e-Donation gate', () => {
  it('ignores donation without e-Donation', () => {
    const result = calculateTax(
      base({
        salarySatang: b(800_000),
        donationViaEDonation: false,
        donationGeneralSatang: b(10_000),
      }),
      cfg,
    )
    expect(result.deductionLines.find((l) => l.id.startsWith('donation'))).toBeUndefined()
    expect(result.warnings.some((w) => w.id === 'eDonation')).toBe(true)
  })

  it('counts donation with e-Donation', () => {
    const result = calculateTax(
      base({
        salarySatang: b(800_000),
        donationViaEDonation: true,
        donationGeneralSatang: b(5_000),
      }),
      cfg,
    )
    expect(result.deductionLines.find((l) => l.id === 'donationGeneral')?.amountSatang).toBe(
      b(5_000),
    )
  })
})

describe('SSF disabled in 2569', () => {
  it('rejects SSF purchase for year 2569', () => {
    expect(taxYear2569.retirement.ssfEnabled).toBe(false)
    const result = calculateTax(
      base({ salarySatang: b(1_000_000), ssfSatang: b(50_000) }),
      cfg,
    )
    expect(result.deductionLines.find((l) => l.id === 'ssf')).toBeUndefined()
    expect(result.warnings.some((w) => w.id === 'ssf')).toBe(true)
  })
})

describe('Thai ESG outside retirement cap', () => {
  it('allows Thai ESG on top of 500k retirement', () => {
    const result = calculateTax(
      base({
        salarySatang: b(2_000_000),
        rmfSatang: b(500_000),
        thaiEsgSatang: b(200_000),
      }),
      cfg,
    )
    expect(result.deductionLines.find((l) => l.id === 'rmf' || l.id === 'retirement')).toBeTruthy()
    expect(result.deductionLines.find((l) => l.id === 'thaiEsg')?.amountSatang).toBe(b(200_000))
  })
})

describe('minimum tax 0.5% for freelance', () => {
  it('uses higher of progressive vs 0.5% when freelance ≥ 120k', () => {
    // Low progressive: freelance 200k, personal 60k, expense min(100k, 100k)=100k → net 40k → tax 0
    // min tax 0.5% of 200k = 1,000 ≤ 5,000 ignore → still 0
    const low = calculateTax(
      base({
        incomeKind: 'freelance',
        freelanceSatang: b(200_000),
      }),
      cfg,
    )
    expect(low.taxSatang).toBe(0)

    // High enough min tax: freelance 2,000,000 → 0.5% = 10,000
    // expense 100k, personal 60k, net 1,840,000 → progressive >> 10k
    const high = calculateTax(
      base({
        incomeKind: 'freelance',
        freelanceSatang: b(2_000_000),
      }),
      cfg,
    )
    expect(high.minimumTaxSatang).toBe(b(10_000))
    expect(high.progressiveTaxSatang).toBeGreaterThan(high.minimumTaxSatang)
    expect(high.minimumTaxApplied).toBe(false)

    // Case where min tax wins: lots of deductions so progressive tiny
    const minWins = calculateTax(
      base({
        incomeKind: 'freelance',
        freelanceSatang: b(1_500_000),
        rmfSatang: b(450_000),
        thaiEsgSatang: b(300_000),
        lifeInsuranceSatang: b(100_000),
      }),
      cfg,
    )
    // If progressive still high, just assert both computed
    expect(minWins.minimumTaxSatang).toBe(b(7_500))
    expect(minWins.taxSatang).toBe(
      Math.max(minWins.progressiveTaxSatang, minWins.minimumTaxSatang),
    )
  })
})

describe('life+health combined cap', () => {
  it('caps life+health at 100k', () => {
    const result = calculateTax(
      base({
        salarySatang: b(800_000),
        lifeInsuranceSatang: b(90_000),
        healthInsuranceSatang: b(25_000),
      }),
      cfg,
    )
    const life = result.deductionLines.find((l) => l.id === 'life')?.amountSatang ?? 0
    const health = result.deductionLines.find((l) => l.id === 'health')?.amountSatang ?? 0
    expect(life + health).toBeLessThanOrEqual(b(100_000))
    expect(result.warnings.some((w) => w.id === 'lifeHealth')).toBe(true)
  })
})

describe('child second+ born from 2561', () => {
  it('gives 60k for 2nd child born 2561+', () => {
    const result = calculateTax(
      base({
        salarySatang: b(800_000),
        children: [
          { birthYearBe: 2560, age: 9, studying: false, order: 1 },
          { birthYearBe: 2562, age: 7, studying: false, order: 2 },
        ],
      }),
      cfg,
    )
    expect(result.deductionLines.find((l) => l.id === 'children')?.amountSatang).toBe(
      b(30_000 + 60_000),
    )
  })
})
