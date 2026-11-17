import type { TaxYearConfig } from './types'

/** 1 baht → 100 satang helper for readable config literals. */
const b = (baht: number) => baht * 100

/**
 * Tax year 2569 (filing early 2570).
 * Numbers are config — change year file, not engine code.
 * Verify against Revenue Department before treating as advice.
 */
export const taxYear2569: TaxYearConfig = {
  yearBe: 2569,
  label: 'ปีภาษี 2569',
  disclaimer:
    'ตัวเลขนี้ประมาณจากกฎปีภาษี 2569 เพื่อให้เห็นภาพคร่าว ๆ ไม่ใช่คำปรึกษาภาษี ก่อนยื่นจริงควรเช็กกับกรมสรรพากรอีกที',
  rdUrl: 'https://www.rd.go.th/',
  brackets: [
    { upToSatang: b(150_000), ratePercent: 0 },
    { upToSatang: b(300_000), ratePercent: 5 },
    { upToSatang: b(500_000), ratePercent: 10 },
    { upToSatang: b(750_000), ratePercent: 15 },
    { upToSatang: b(1_000_000), ratePercent: 20 },
    { upToSatang: b(2_000_000), ratePercent: 25 },
    { upToSatang: b(5_000_000), ratePercent: 30 },
    { upToSatang: Infinity, ratePercent: 35 },
  ],
  expense: {
    ratePercent: 50,
    maxSatang: b(100_000),
    sharedAcross401And402: true,
  },
  personal: {
    selfSatang: b(60_000),
    spouseNoIncomeSatang: b(60_000),
    childBaseSatang: b(30_000),
    childSecondPlusSatang: b(60_000),
    childSecondPlusBornFromBe: 2561,
    childMaxAge: 20,
    childStudentMinAge: 20,
    childStudentMaxAge: 25,
    parentSatang: b(30_000),
    parentMaxIncomeSatang: b(30_000),
    parentMinAge: 60,
    disabilitySatang: b(60_000),
    pregnancyMaxSatang: b(60_000),
  },
  insurance: {
    /** ม.33 ceiling after wage base rise to 17,500 (875×12). */
    socialSecurityMaxSatang: b(10_500),
    lifeMaxSatang: b(100_000),
    healthMaxSatang: b(25_000),
    lifeHealthCombinedMaxSatang: b(100_000),
    parentHealthMaxSatang: b(15_000),
  },
  retirement: {
    groupMaxSatang: b(500_000),
    rmfMaxPctOfIncome: 30,
    rmfMaxSatang: b(500_000),
    pvdMaxPctOfWage: 15,
    pvdMaxSatang: b(500_000),
    pensionInsuranceMaxSatang: b(200_000),
    gpfMaxSatang: b(500_000),
    nsfMaxSatang: b(500_000),
    ssfEnabled: false,
    ssfMaxPctOfIncome: 30,
    ssfMaxSatang: b(200_000),
  },
  thaiEsg: {
    enabled: true,
    maxPctOfIncome: 30,
    maxSatang: b(300_000),
    outsideRetirementCap: true,
    tip: 'ปี 2569 เป็นปีสุดท้ายของ Thai ESG แบบพิเศษ ลดได้ไม่เกิน 30% ของรายได้ และไม่เกิน 300,000 บาท ส่วนนี้ไม่นับรวมเพดานเกษียณ 500,000 บาท',
  },
  donation: {
    requiresEDonation: true,
    generalMaxPctOfIncomeAfterExpenseDeduction: 10,
    educationSportsMultiplier: 2,
  },
  minimumTax: {
    enabled: true,
    incomeThresholdSatang: b(120_000),
    ratePercent: 0.5,
    ignoreIfAtOrBelowSatang: b(5_000),
  },
  special: [
    {
      id: 'solarRooftop',
      label: 'โซลาร์รูฟท็อป',
      maxSatang: b(200_000),
      enabled: false,
      hint: 'มาตรการชั่วคราว — เปิดใน config เมื่อยืนยันเงื่อนไขปีนั้น',
    },
  ],
}
