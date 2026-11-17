import { useMemo, useState, type ReactNode } from 'react'
import { ACTIVE_TAX_YEAR, getTaxYearConfig } from '../config'
import {
  bahtToSatang,
  calculateTax,
  emptyInput,
  formatBaht,
  type IncomeKind,
  type MaritalStatus,
  type TaxInput,
} from '../engine'
import { EquationBar } from './EquationBar'
import { MoneyInput, parseBahtInput } from './MoneyInput'
import { RangeMoney } from './RangeMoney'
import { ResultView } from './ResultView'
import { Tooltip } from './Tooltip'
import type { WealthTier } from '../characters/tiers'
import { VizBoard } from './VizBoard'

type Step = 1 | 2 | 3 | 4
type DeductionGroup = 'family' | 'insurance' | 'retirement' | 'other'
type CharacterGender = 'male' | 'female'
type PartnerTier = Extract<WealthTier, 4 | 5>

/** Step 1 only — identity choices */
type IdentityState = {
  selfGender: CharacterGender
  maritalStatus: MaritalStatus
  spouseHasIncome: boolean
  incomeKind: IncomeKind
  partnerGender: CharacterGender | null
  /** When spouse has income: random LV.4 or LV.5 outfit */
  partnerTier: PartnerTier | null
}

/** Step 2+ — money / deductions (reset when back to step 1) */
type CalcState = {
  period: 'month' | 'year'
  salary: string
  freelance: string
  socialSecurity: string
  lifeInsurance: string
  healthInsurance: string
  parentHealth: string
  claimParents: boolean
  parentAgeOk: boolean
  parentIncomeOk: boolean
  parentCount: '0' | '1' | '2'
  childCount: string
  childStudying: boolean
  rmf: string
  pvd: string
  pension: string
  thaiEsg: string
  donationViaEDonation: boolean | null
  donationGeneral: string
  taxWithheld: string
  pregnancy: string
}

type FormState = IdentityState & CalcState

const initialIdentity: IdentityState = {
  selfGender: 'female',
  maritalStatus: 'single',
  spouseHasIncome: false,
  incomeKind: 'salary',
  partnerGender: null,
  partnerTier: null,
}

const initialCalc: CalcState = {
  period: 'year',
  salary: '',
  freelance: '',
  socialSecurity: '',
  lifeInsurance: '',
  healthInsurance: '',
  parentHealth: '',
  claimParents: false,
  parentAgeOk: false,
  parentIncomeOk: false,
  parentCount: '0',
  childCount: '0',
  childStudying: false,
  rmf: '',
  pvd: '',
  pension: '',
  thaiEsg: '',
  donationViaEDonation: null,
  donationGeneral: '',
  taxWithheld: '',
  pregnancy: '',
}

const initialForm: FormState = { ...initialIdentity, ...initialCalc }

function rollPartnerGender(self: CharacterGender): CharacterGender {
  // gimmick: random, slight bias toward opposite
  const opposite: CharacterGender = self === 'male' ? 'female' : 'male'
  return Math.random() < 0.65 ? opposite : self
}

function rollPartnerTier(): PartnerTier {
  return Math.random() < 0.5 ? 4 : 5
}

function toAnnual(amount: number, period: 'month' | 'year'): number {
  return period === 'month' ? amount * 12 : amount
}

function buildInput(form: FormState): TaxInput {
  const input = emptyInput()
  input.maritalStatus = form.maritalStatus
  input.spouseHasIncome = form.spouseHasIncome
  input.incomeKind = form.incomeKind

  const salaryBaht = toAnnual(parseBahtInput(form.salary), form.period)
  const freelanceBaht = toAnnual(parseBahtInput(form.freelance), form.period)

  if (form.incomeKind === 'salary' || form.incomeKind === 'both') {
    input.salarySatang = bahtToSatang(salaryBaht)
  }
  if (form.incomeKind === 'freelance' || form.incomeKind === 'both') {
    input.freelanceSatang = bahtToSatang(freelanceBaht)
  }

  input.socialSecuritySatang = bahtToSatang(parseBahtInput(form.socialSecurity))
  input.lifeInsuranceSatang = bahtToSatang(parseBahtInput(form.lifeInsurance))
  input.healthInsuranceSatang = bahtToSatang(parseBahtInput(form.healthInsurance))
  input.parentHealthInsuranceSatang = bahtToSatang(parseBahtInput(form.parentHealth))
  input.rmfSatang = bahtToSatang(parseBahtInput(form.rmf))
  input.pvdSatang = bahtToSatang(parseBahtInput(form.pvd))
  input.pensionInsuranceSatang = bahtToSatang(parseBahtInput(form.pension))
  input.thaiEsgSatang = bahtToSatang(parseBahtInput(form.thaiEsg))
  input.pregnancySatang = bahtToSatang(parseBahtInput(form.pregnancy))
  input.taxWithheldSatang = bahtToSatang(parseBahtInput(form.taxWithheld))

  const kids = Math.min(10, Math.max(0, Math.floor(Number(form.childCount) || 0)))
  input.children = Array.from({ length: kids }, (_, i) => ({
    order: i + 1,
    age: 10,
    studying: form.childStudying,
    birthYearBe: i === 0 ? 2560 : 2562,
  }))

  if (form.claimParents && form.parentAgeOk && form.parentIncomeOk) {
    const n = Number(form.parentCount)
    input.parents = Array.from({ length: n }, () => ({
      age: 65,
      annualIncomeSatang: 0,
      qualifies: true,
    }))
  }

  if (form.donationViaEDonation === true) {
    input.donationViaEDonation = true
    input.donationGeneralSatang = bahtToSatang(parseBahtInput(form.donationGeneral))
  } else if (form.donationViaEDonation === false && parseBahtInput(form.donationGeneral) > 0) {
    input.donationViaEDonation = false
    input.donationGeneralSatang = bahtToSatang(parseBahtInput(form.donationGeneral))
  }

  return input
}

const STEPS = ['เริ่มต้น', 'รายได้', 'ลดหย่อน', 'สรุป'] as const

export function Wizard() {
  const cfg = getTaxYearConfig(ACTIVE_TAX_YEAR)
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>(initialForm)
  const [deductionGroup, setDeductionGroup] = useState<DeductionGroup>('family')

  const result = useMemo(() => calculateTax(buildInput(form), cfg), [form, cfg])

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }))
  }

  /** Back to identity page → wipe income/deduction inputs */
  function goIdentity() {
    setForm((f) => ({
      ...f,
      ...initialCalc,
      partnerGender: f.maritalStatus === 'married' ? rollPartnerGender(f.selfGender) : null,
      partnerTier:
        f.maritalStatus === 'married' && f.spouseHasIncome ? rollPartnerTier() : null,
    }))
    setDeductionGroup('family')
    setStep(1)
  }

  function setSelfGender(gender: CharacterGender) {
    patch({
      selfGender: gender,
      partnerGender:
        form.maritalStatus === 'married' ? rollPartnerGender(gender) : null,
    })
  }

  function setMarital(status: MaritalStatus) {
    const married = status === 'married'
    const spouseHasIncome = married ? form.spouseHasIncome : false
    patch({
      maritalStatus: status,
      spouseHasIncome,
      partnerGender: married ? rollPartnerGender(form.selfGender) : null,
      partnerTier: married && spouseHasIncome ? rollPartnerTier() : null,
    })
  }

  function setSpouseHasIncome(has: boolean) {
    patch({
      spouseHasIncome: has,
      partnerTier: has ? rollPartnerTier() : null,
    })
  }

  function restart() {
    setForm(initialForm)
    setStep(1)
    setDeductionGroup('family')
  }

  const canNextIncome =
    (form.incomeKind === 'salary' && parseBahtInput(form.salary) > 0) ||
    (form.incomeKind === 'freelance' && parseBahtInput(form.freelance) > 0) ||
    (form.incomeKind === 'both' &&
      parseBahtInput(form.salary) > 0 &&
      parseBahtInput(form.freelance) > 0)

  const incomeMax = form.period === 'month' ? 200_000 : 2_000_000
  const incomeStep = form.period === 'month' ? 1_000 : 5_000
  return (
    <div className="app-shell">
      <aside className="viz-pane" aria-label="ตัวละครและเกจภาษี">
        <VizBoard
          cfg={cfg}
          result={result}
          intro={step === 1}
          selfGender={form.selfGender}
          maritalStatus={step === 2 ? 'single' : form.maritalStatus}
          partnerGender={step === 2 ? null : form.partnerGender}
          partnerTier={step === 2 ? null : form.partnerTier}
          spouseHasIncome={step === 2 ? false : form.spouseHasIncome}
        />
      </aside>

      <main className="form-pane">
      {step < 4 && <Brand yearLabel={cfg.label} />}

      {step < 4 && (
        <nav className="mb-7 mt-6" aria-label="ขั้นตอน">
          <ol className="flex gap-1.5">
            {STEPS.map((label, i) => {
              const n = (i + 1) as Step
              const active = step === n
              const done = step > n
              return (
                <li key={label} className="flex-1">
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${
                      active || done ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-mid)]'
                    }`}
                  />
                  <p
                    className={`mt-2 text-[11px] ${
                      active
                        ? 'font-semibold text-[var(--color-brown-deep)]'
                        : 'text-[var(--color-faint)]'
                    }`}
                  >
                    {label}
                  </p>
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      {step === 1 && (
        <section className="space-y-6 animate-[fadeIn_0.3s_ease]">
          <div className="quest-intro">
            <p className="quest-intro__eyebrow">เควสต์แรก</p>
            <p className="quest-intro__title">มาสร้างตัวละครคำนวณภาษีกันเถอะ</p>
            <p className="quest-intro__body">
              เลือกหน้าตาตัวละครก่อน แล้วค่อยใส่รายได้ ยิ่งรายได้/ขั้นภาษีสูง
              ชุดตัวละครจะปังขึ้น (แชร์ได้ ไม่โชว์จำนวนเงิน)
            </p>
          </div>

          <Question
            title="ตัวละครหน้าตาแบบไหน?"
            tip={'แค่เลือกเพศตัวละครบนจอ\nไม่เกี่ยวกับการคำนวณภาษี'}
          >
            <ChoiceRow
              options={[
                { value: 'female', label: 'ผู้หญิง' },
                { value: 'male', label: 'ผู้ชาย' },
              ]}
              value={form.selfGender}
              onChange={(v) => setSelfGender(v as CharacterGender)}
            />
          </Question>

          <Question title="ปีนี้เป็นโสด หรือแต่งงานแล้ว?">
            <ChoiceRow
              options={[
                { value: 'single', label: 'โสด' },
                { value: 'married', label: 'แต่งแล้ว' },
              ]}
              value={form.maritalStatus}
              onChange={(v) => setMarital(v as MaritalStatus)}
            />
          </Question>

          {form.maritalStatus === 'married' && (
            <>
              <Question title="แฟน/คู่มีรายได้ด้วยไหม?">
                <ChoiceRow
                  options={[
                    { value: 'no', label: 'ไม่มี' },
                    { value: 'yes', label: 'มี' },
                  ]}
                  value={form.spouseHasIncome ? 'yes' : 'no'}
                  onChange={(v) => setSpouseHasIncome(v === 'yes')}
                />
              </Question>
              <Fyi title="FYI · คู่สมรส">
                <ul>
                  <li>
                    คู่ไม่มีรายได้ → ลดหย่อนคู่ได้อีก{' '}
                    {formatBaht(cfg.personal.spouseNoIncomeSatang)} บาท
                  </li>
                  <li>คู่มีรายได้เอง → ลดหย่อนส่วนนี้ไม่ได้</li>
                </ul>
              </Fyi>
            </>
          )}

          <Question
            title="เงินเข้ามาจากทางไหน?"
            tip={'เงินเดือน = มาตรา 40(1)\nรับจ้างทั่วไป = 40(2)'}
          >
            <ChoiceRow
              options={[
                { value: 'salary', label: 'เงินเดือน' },
                { value: 'freelance', label: 'ฟรีแลนซ์' },
                { value: 'both', label: 'ทั้งคู่เลย' },
              ]}
              value={form.incomeKind}
              onChange={(v) => patch({ incomeKind: v as IncomeKind })}
            />
          </Question>

          <PrimaryButton onClick={() => setStep(2)}>ไปใส่รายได้</PrimaryButton>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-5 animate-[fadeIn_0.3s_ease]">
          <Question
            title={
              form.period === 'year'
                ? 'ปีนี้คิดว่าได้เงินเท่าไหร่?'
                : 'เดือนหนึ่งได้ประมาณเท่าไหร่?'
            }
          >
            <ChoiceRow
              options={[
                { value: 'month', label: 'คิดเป็นเดือน' },
                { value: 'year', label: 'คิดทั้งปี' },
              ]}
              value={form.period}
              onChange={(v) => patch({ period: v as 'month' | 'year' })}
            />
          </Question>

          {(form.incomeKind === 'salary' || form.incomeKind === 'both') && (
            <RangeMoney
              id="salary"
              label={
                form.period === 'month' ? 'เงินเดือน (ยังไม่หักอะไรเลย)' : 'เงินเดือนทั้งปี (รวมโบนัส)'
              }
              value={form.salary}
              onChange={(salary) => patch({ salary })}
              hint="สามารถเลื่อนหรือกรอกตัวเลขก็ได้"
              max={incomeMax}
              step={incomeStep}
            />
          )}

          {(form.incomeKind === 'freelance' || form.incomeKind === 'both') && (
            <RangeMoney
              id="freelance"
              label={
                form.period === 'month' ? 'ฟรีแลนซ์ต่อเดือน' : 'ฟรีแลนซ์ทั้งปี'
              }
              value={form.freelance}
              onChange={(freelance) => patch({ freelance })}
              hint="งานรับจ้างทั่วไปนะ ไม่รวมค่าเช่าหรือขายของ"
              max={incomeMax}
              step={incomeStep}
            />
          )}

          <MoneyInput
            id="withheld"
            label="มีภาษีถูกหักไปแล้วไหม (ทั้งปี)"
            value={form.taxWithheld}
            onChange={(taxWithheld) => patch({ taxWithheld })}
            optional
            hint="ดูในสลิป 50 ทวิ หรือใบหัก ณ ที่จ่ายก็ได้"
          />
          <Fyi title="FYI · ภาษีหักแล้ว">
            <ul>
              <li>ไม่รู้ยอดก็ว่างไว้ก่อนได้</li>
              <li>ใส่รายได้คร่าว ๆ ก็พอให้เห็นภาพภาษี</li>
              <li>มีสลิปค่อยเติมทีหลัง</li>
            </ul>
          </Fyi>

          {result.grossSatang > 0 && (
            <div className="space-y-2">
              <LiveTaxStrip taxSatang={result.taxSatang} />
              <EquationBar result={result} />
            </div>
          )}

          <NavRow onBack={goIdentity} onNext={() => setStep(3)} nextDisabled={!canNextIncome} />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-5 animate-[fadeIn_0.3s_ease]">
          <header className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--color-ink)]">
              <Tooltip text="ลดหย่อนคือส่วนที่รัฐยอมไม่เอามาคิดภาษี">มีอะไรลดหย่อนได้บ้าง?</Tooltip>
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              เลือกทีละหมวดก็ได้ ไม่มีก็ข้ามไป ไม่เป็นไร
            </p>
          </header>

          <Fyi title="FYI · ลดหย่อนคืออะไร">
            <ul>
              <li>ยอดที่รัฐยอมหักออกก่อนคิดภาษี</li>
              <li>ยิ่งหักได้มาก ภาษีก็ยิ่งน้อย</li>
              <li>ไม่จำเป็นต้องกรอกให้ครบทุกช่อง มีเท่าแค่ไหนใส่แค่นั้น</li>
            </ul>
          </Fyi>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['family', 'ครอบครัว'],
                ['insurance', 'ประกัน'],
                ['retirement', 'ออม/เกษียณ'],
                ['other', 'อื่น ๆ'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDeductionGroup(id)}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition border-[3px] ${
                  deductionGroup === id
                    ? 'border-[#2d6f8f] bg-[#e8f5fb] text-[#1e2a32] shadow-[2px_2px_0_#2d6f8f]'
                    : 'border-[var(--color-mid)] bg-white text-[var(--color-muted)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {deductionGroup === 'family' && (
            <div className="panel space-y-4 p-4">
              <Fyi title="FYI · ครอบครัว">
                <ul>
                  <li>ส่วนตัวหักให้อัตโนมัติแล้ว ไม่ต้องทำอะไร</li>
                  <li>ลูกคนแรกหัก {formatBaht(cfg.personal.childBaseSatang)}</li>
                  <li>
                    คนถัดไปที่เกิดตั้งแต่ปี {cfg.personal.childSecondPlusBornFromBe} หัก{' '}
                    {formatBaht(cfg.personal.childSecondPlusSatang)}
                  </li>
                  <li>
                    พ่อแม่ต้องอายุ {cfg.personal.parentMinAge} ขึ้นไป และรายได้ไม่เกิน{' '}
                    {formatBaht(cfg.personal.parentMaxIncomeSatang)} บาท/ปี
                  </li>
                </ul>
              </Fyi>
              <p className="text-sm text-[var(--color-muted)]">
                ค่าลดหย่อนส่วนตัวหักให้แล้ว{' '}
                <span className="mark">{formatBaht(cfg.personal.selfSatang)}</span> บาท
                {form.maritalStatus === 'married' && !form.spouseHasIncome
                  ? ` + คู่ไม่มีรายได้เพิ่มอีก ${formatBaht(cfg.personal.spouseNoIncomeSatang)} บาท`
                  : ''}
              </p>
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold">มีลูกกี่คนที่ลดหย่อนได้?</span>
                <select
                  className="w-full rounded-2xl border border-[rgb(34_34_34/0.1)] bg-white px-3 py-3"
                  value={form.childCount}
                  onChange={(e) => patch({ childCount: e.target.value })}
                >
                  {Array.from({ length: 6 }, (_, i) => (
                    <option key={i} value={String(i)}>
                      {i === 0 ? 'ไม่มี' : `${i} คน`}
                    </option>
                  ))}
                </select>
              </label>
              {Number(form.childCount) > 0 && (
                <label className="flex items-start gap-2 text-sm text-[var(--color-ink)]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.childStudying}
                    onChange={(e) => patch({ childStudying: e.target.checked })}
                  />
                  <span>มีลูกอายุ 20–25 ที่ยังเรียนอยู่ (นับเพิ่มได้)</span>
                </label>
              )}

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold">เลี้ยงดูพ่อแม่ไหม?</legend>
                <ChoiceRow
                  options={[
                    { value: 'no', label: 'ไม่' },
                    { value: 'yes', label: 'ใช่' },
                  ]}
                  value={form.claimParents ? 'yes' : 'no'}
                  onChange={(v) =>
                    patch({
                      claimParents: v === 'yes',
                      parentCount: v === 'yes' ? '1' : '0',
                    })
                  }
                />
                {form.claimParents && (
                  <div className="space-y-3 rounded-2xl bg-[var(--color-paper)] p-3">
                    <p className="text-xs text-[var(--color-faint)]">
                      ต้องอายุ {cfg.personal.parentMinAge}+ และรายได้ไม่เกิน{' '}
                      {formatBaht(cfg.personal.parentMaxIncomeSatang)} บาท/ปี
                    </p>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={form.parentAgeOk}
                        onChange={(e) => patch({ parentAgeOk: e.target.checked })}
                      />
                      อายุครบ 60 ปีขึ้นไป
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={form.parentIncomeOk}
                        onChange={(e) => patch({ parentIncomeOk: e.target.checked })}
                      />
                      รายได้ไม่เกิน {formatBaht(cfg.personal.parentMaxIncomeSatang)} บาท/ปี
                    </label>
                    <ChoiceRow
                      options={[
                        { value: '1', label: '1 คน' },
                        { value: '2', label: '2 คน' },
                      ]}
                      value={form.parentCount === '0' ? '1' : form.parentCount}
                      onChange={(v) => patch({ parentCount: v as '1' | '2' })}
                    />
                  </div>
                )}
              </fieldset>
            </div>
          )}

          {deductionGroup === 'insurance' && (
            <div className="panel space-y-4 p-4">
              <Fyi title="FYI · ประกัน">
                <ul>
                  <li>
                    ประกันสังคมดูจากสลิปเงินเดือน รวมทั้งปีได้เลย ปีนี้เพดานประมาณ{' '}
                    {formatBaht(cfg.insurance.socialSecurityMaxSatang)} บาท
                  </li>
                  <li>
                    ประกันชีวิต + สุขภาพตัวเอง รวมกันไม่เกิน{' '}
                    {formatBaht(cfg.insurance.lifeHealthCombinedMaxSatang)} บาท
                  </li>
                  <li>
                    ประกันสุขภาพพ่อแม่ หักได้อีกไม่เกิน{' '}
                    {formatBaht(cfg.insurance.parentHealthMaxSatang)} บาท
                  </li>
                </ul>
              </Fyi>
              <MoneyInput
                id="sso"
                label="ประกันสังคมทั้งปี"
                value={form.socialSecurity}
                onChange={(socialSecurity) => patch({ socialSecurity })}
                hint={`สูงสุด ${formatBaht(cfg.insurance.socialSecurityMaxSatang)} บาท (ม.33 ปี 2569)`}
                optional
              />
              <MoneyInput
                id="life"
                label="ประกันชีวิต"
                value={form.lifeInsurance}
                onChange={(lifeInsurance) => patch({ lifeInsurance })}
                optional
              />
              <MoneyInput
                id="health"
                label="ประกันสุขภาพตัวเอง"
                value={form.healthInsurance}
                onChange={(healthInsurance) => patch({ healthInsurance })}
                hint={`รวมกับประกันชีวิตไม่เกิน ${formatBaht(cfg.insurance.lifeHealthCombinedMaxSatang)}`}
                optional
              />
              <MoneyInput
                id="parentHealth"
                label="ประกันสุขภาพบิดามารดา"
                value={form.parentHealth}
                onChange={(parentHealth) => patch({ parentHealth })}
                optional
              />
            </div>
          )}

          {deductionGroup === 'retirement' && (
            <div className="panel space-y-4 p-4">
              <Fyi title="FYI · ออม / เกษียณ">
                <ul>
                  <li>
                    RMF, กองทุนสำรองเลี้ยงชีพ, กบข., กอช., ประกันบำนาญ รวมกันไม่เกิน{' '}
                    {formatBaht(cfg.retirement.groupMaxSatang)} บาท
                  </li>
                  <li>Thai ESG แยกต่างหาก ไม่กินโควตานี้</li>
                  <li>SSF ซื้อใหม่ปีนี้ลดไม่ได้แล้ว</li>
                </ul>
              </Fyi>
              <p className="text-xs leading-relaxed text-[var(--color-income-text)]">{cfg.thaiEsg.tip}</p>
              <MoneyInput
                id="rmf"
                label="RMF"
                value={form.rmf}
                onChange={(rmf) => patch({ rmf })}
                optional
              />
              <MoneyInput
                id="pvd"
                label="กองทุนสำรองเลี้ยงชีพ / กบข. / กอช."
                value={form.pvd}
                onChange={(pvd) => patch({ pvd })}
                optional
              />
              <MoneyInput
                id="pension"
                label="ประกันบำนาญ"
                value={form.pension}
                onChange={(pension) => patch({ pension })}
                optional
              />
              <MoneyInput
                id="thaiEsg"
                label="Thai ESG"
                value={form.thaiEsg}
                onChange={(thaiEsg) => patch({ thaiEsg })}
                hint={`ไม่นับรวมเพดานเกษียณ ${formatBaht(cfg.retirement.groupMaxSatang)}`}
                optional
              />
              <p className="text-xs text-[var(--color-faint)]">
                ไม่มีกองทุนพวกนี้ก็ข้ามได้ ไม่กระทบ
              </p>
            </div>
          )}

          {deductionGroup === 'other' && (
            <div className="panel space-y-4 p-4">
              <Fyi title="FYI · บริจาค / อื่น ๆ">
                <ul>
                  <li>ตั้งแต่ปี 2569 บริจาคต้องผ่าน e-Donation ถึงจะลดหย่อนได้</li>
                  <li>
                    บริจาคทั่วไปลดได้ไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่ายกับลดหย่อนอื่น
                  </li>
                  <li>
                    ค่าฝากครรภ์/คลอด ลดได้ไม่เกิน{' '}
                    {formatBaht(cfg.personal.pregnancyMaxSatang)} บาท
                  </li>
                </ul>
              </Fyi>
              <Question title="บริจาคผ่าน e-Donation ไหม?">
                <ChoiceRow
                  options={[
                    { value: 'yes', label: 'ใช่' },
                    { value: 'no', label: 'ไม่ / ไม่บริจาค' },
                  ]}
                  value={
                    form.donationViaEDonation === true
                      ? 'yes'
                      : form.donationViaEDonation === false
                        ? 'no'
                        : ''
                  }
                  onChange={(v) =>
                    patch({
                      donationViaEDonation: v === 'yes',
                      donationGeneral: v === 'no' ? '' : form.donationGeneral,
                    })
                  }
                />
              </Question>
              {form.donationViaEDonation && (
                <MoneyInput
                  id="donation"
                  label="ยอดบริจาค (ทั่วไป)"
                  value={form.donationGeneral}
                  onChange={(donationGeneral) => patch({ donationGeneral })}
                />
              )}
              <MoneyInput
                id="pregnancy"
                label="ค่าฝากครรภ์/คลอด"
                value={form.pregnancy}
                onChange={(pregnancy) => patch({ pregnancy })}
                optional
              />
            </div>
          )}

          {result.grossSatang > 0 && (
            <div className="space-y-2">
              <LiveTaxStrip taxSatang={result.taxSatang} />
              <EquationBar result={result} />
            </div>
          )}

          <NavRow
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextLabel="ดูสรุปภาษี"
          />
        </section>
      )}

      {step === 4 && (
        <ResultView
          cfg={cfg}
          result={result}
          onBack={() => setStep(3)}
          onRestart={restart}
          hideChart
          selfGender={form.selfGender}
          maritalStatus={form.maritalStatus}
          partnerGender={form.partnerGender}
          partnerTier={form.partnerTier}
          spouseHasIncome={form.spouseHasIncome}
        />
      )}
      </main>
    </div>
  )
}

function Brand({ yearLabel }: { yearLabel: string }) {
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-ink)] sm:text-4xl">
        โดน<span className="text-[var(--color-tax-text)]">กี่บาท</span>
      </h1>
      <div className="max-w-md space-y-1 text-sm leading-relaxed text-[var(--color-muted)]">
        <p>
          สร้างตัวละคร · ใส่รายได้ · ดูว่าปี 2569 โดนภาษีกี่บาท
        </p>
        <p className="text-[var(--color-faint)]">
          {yearLabel} · คิดในเครื่องคุณ · ไม่เก็บรายได้/ข้อมูลส่วนตัว
        </p>
      </div>
    </header>
  )
}

function LiveTaxStrip({ taxSatang }: { taxSatang: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-[rgb(34_34_34/0.06)]">
      <span className="live-pill">คร่าว ๆ ตอนนี้</span>
      <span className="num text-lg font-extrabold text-[var(--color-tax-text)]">
        {formatBaht(taxSatang)} บาท
      </span>
    </div>
  )
}

function Question({
  title,
  tip,
  children,
}: {
  title: string
  tip?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold leading-snug text-[var(--color-ink)]">
        {tip ? <Tooltip text={tip}>{title}</Tooltip> : title}
      </h2>
      {children}
    </div>
  )
}

function Fyi({ title = 'ฝากไว้ให้คิดส์', children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="fyi" role="note">
      <p className="fyi__title">{title}</p>
      <div className="fyi__body">{children}</div>
    </aside>
  )
}

function ChoiceRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`choice ${active ? 'choice--on' : ''}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-primary w-full">
      {children}
    </button>
  )
}

function NavRow({
  onBack,
  onNext,
  nextLabel = 'ต่อไป',
  nextDisabled,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onBack} className="btn-ghost">
        « ย้อนกลับ
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="btn-primary flex-1"
      >
        {nextLabel}
      </button>
    </div>
  )
}
