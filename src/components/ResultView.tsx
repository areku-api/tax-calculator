import { useState } from 'react'
import type { TaxYearConfig } from '../config'
import type { WealthTier } from '../characters/tiers'
import type { MaritalStatus, TaxResult } from '../engine'
import { formatBaht, formatBahtWithUnit } from '../engine'
import { PowerGauge } from './PowerGauge'
import { Disclaimer } from './Disclaimer'
import { ShareCard } from './ShareCard'
import { Tooltip } from './Tooltip'

type CharacterGender = 'male' | 'female'

type Props = {
  cfg: TaxYearConfig
  result: TaxResult
  onBack: () => void
  onRestart: () => void
  /** Chart already shown in viz pane */
  hideChart?: boolean
  selfGender?: CharacterGender
  maritalStatus?: MaritalStatus
  partnerGender?: CharacterGender | null
  partnerTier?: Extract<WealthTier, 4 | 5> | null
  spouseHasIncome?: boolean
}

export function ResultView({
  cfg,
  result,
  onBack,
  onRestart,
  hideChart = false,
  selfGender = 'female',
  maritalStatus = 'single',
  partnerGender = null,
  partnerTier = null,
  spouseHasIncome = false,
}: Props) {
  const [showHow, setShowHow] = useState(false)
  const zeroTax = result.taxSatang === 0

  return (
    <div className="space-y-5 animate-[fadeIn_0.35s_ease]">
      <header className="space-y-2">
        <span className="live-pill">{cfg.label}</span>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          ปีนี้ น่าจะเสียภาษีราว ๆ
        </h2>
      </header>

      <Disclaimer cfg={cfg} />

      <div className="panel space-y-3 p-5 text-center sm:text-left">
        <p className="tax-hero-num num">
          {formatBaht(result.taxSatang)}
          <span className="ml-2 text-lg font-semibold text-[var(--color-faint)]">บาท</span>
        </p>
        {zeroTax ? (
          <p className="text-sm leading-relaxed text-[var(--color-allowance)]">
            โล่ง ~ ยังไม่ถึงเกณฑ์เสียภาษี
          </p>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            คิดเป็นประมาณ{' '}
            <span className="mark num font-semibold">
              {result.effectiveRatePercent.toFixed(2)}%
            </span>{' '}
            ของรายได้ทั้งปี {' '}
            <Tooltip text="เอาภาษีหารรายได้ทั้งปี แล้วคูณร้อย">
              <span className="sr-only">อัตราเฉลี่ย</span>
            </Tooltip>
          </p>
        )}

        {result.taxWithheldSatang > 0 && (
          <div className="rounded-2xl bg-[var(--color-paper)] px-4 py-3 text-left text-sm">
            {result.refundSatang > 0 && (
              <p className="font-semibold text-[var(--color-allowance)]">
                น่าจะได้คืนราว {formatBahtWithUnit(result.refundSatang)}
              </p>
            )}
            {result.netPayableSatang > 0 && (
              <p className="font-semibold text-[var(--color-tax-text)]">
                น่าจะต้องจ่ายเพิ่มราว {formatBahtWithUnit(result.netPayableSatang)}
              </p>
            )}
            {result.refundSatang === 0 && result.netPayableSatang === 0 && (
              <p className="text-[var(--color-muted)]">หักไว้พอดีกับที่ประมาณได้เลย</p>
            )}
            <p className="mt-1 text-xs text-[var(--color-faint)]">
              ถูกหักไปแล้ว {formatBahtWithUnit(result.taxWithheldSatang)}
            </p>
          </div>
        )}

        {result.minimumTaxSatang > 0 && (
          <div className="rounded-2xl border border-[rgb(34_34_34/0.08)] px-4 py-3 text-left text-sm text-[var(--color-muted)]">
            <p className="font-semibold text-[var(--color-ink)]">เทียบสองวิธี (ฟรีแลนซ์)</p>
            <ul className="mt-2 space-y-1">
              <li>
                คิดตามขั้น: {formatBahtWithUnit(result.progressiveTaxSatang)}
                {!result.minimumTaxApplied && ' ← ใช้ตัวนี้'}
              </li>
              <li>
                อย่างต่ำ 0.5% ของรายได้ฟรีแลนซ์: {formatBahtWithUnit(result.minimumTaxSatang)}
                {result.minimumTaxApplied && ' ← ใช้ตัวนี้ เพราะสูงกว่า'}
              </li>
            </ul>
          </div>
        )}
      </div>

      {!hideChart && <PowerGauge cfg={cfg} result={result} />}

      <ShareCard
        result={result}
        selfGender={selfGender}
        maritalStatus={maritalStatus}
        partnerGender={partnerGender}
        partnerTier={partnerTier}
        spouseHasIncome={spouseHasIncome}
      />

      {cfg.thaiEsg.enabled && (
        <p className="rounded-2xl bg-[var(--color-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-income-text)]">
          {cfg.thaiEsg.tip}
        </p>
      )}

      {result.warnings.length > 0 && (
        <ul className="space-y-2">
          {result.warnings.map((w) => (
            <li
              key={w.id}
              className="rounded-2xl border border-[var(--color-mid)] bg-[var(--color-soft)] px-3 py-2 text-xs text-[var(--color-income-text)]"
            >
              {w.message}
            </li>
          ))}
        </ul>
      )}

      {result.headroom.some((h) => h.remainingSatang > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            <Tooltip text="ยังมีที่ว่างในหมวดเหล่านี้ ถ้าอยากใส่เพิ่มเพื่อลดภาษี">
              ยังลดหย่อนเพิ่มได้อีกนะ
            </Tooltip>
          </h3>
          <ul className="space-y-1.5">
            {result.headroom
              .filter((h) => h.remainingSatang > 0)
              .slice(0, 4)
              .map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm"
                >
                  <span className="text-[var(--color-muted)]">{h.label}</span>
                  <span className="num font-semibold text-[var(--color-allowance)]">
                    {formatBaht(h.remainingSatang)} บาท
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={() => setShowHow((v) => !v)} className="btn-ghost w-full">
        {showHow ? 'ซ่อนรายละเอียด' : 'อยากดูว่าคิดยังไง'}
      </button>

      {showHow && (
        <ol className="panel space-y-2 p-4 text-sm animate-[fadeIn_0.25s_ease]">
          <Line label="รายได้ทั้งปี" value={result.grossSatang} tone="income" />
          <Line label="หักค่าใช้จ่าย" value={-result.expenseSatang} tone="expense" />
          {result.deductionLines.map((d) => (
            <Line key={d.id} label={`หัก${d.label}`} value={-d.amountSatang} tone="allowance" />
          ))}
          <Line label="เงินได้สุทธิ" value={result.netIncomeSatang} bold />
          {result.bracketLines
            .filter((br) => br.taxSatang > 0)
            .map((br, i) => (
              <li key={i} className="flex justify-between gap-3 border-t border-[rgb(34_34_34/0.06)] pt-2">
                <span className="text-[var(--color-faint)]">
                  เลเวล <span className="mark">{br.ratePercent}%</span>
                  <span className="num ml-1 text-xs">({formatBaht(br.taxableSatang)})</span>
                </span>
                <span className="num font-semibold text-[var(--color-tax-text)]">
                  {formatBaht(br.taxSatang)}
                </span>
              </li>
            ))}
          <Line label="ภาษีรวม" value={result.taxSatang} bold tone="tax" />
        </ol>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} className="btn-ghost">
          « ย้อนกลับ
        </button>
        <button type="button" onClick={onRestart} className="btn-primary flex-1">
          เริ่มใหม่
        </button>
      </div>
    </div>
  )
}

function Line({
  label,
  value,
  bold,
  tone,
}: {
  label: string
  value: number
  bold?: boolean
  tone?: 'income' | 'expense' | 'allowance' | 'tax'
}) {
  const color =
    tone === 'income'
      ? 'text-[var(--color-income-text)]'
      : tone === 'expense'
        ? 'text-[var(--color-expense)]'
        : tone === 'allowance'
          ? 'text-[var(--color-allowance)]'
          : tone === 'tax'
            ? 'text-[var(--color-tax-text)]'
            : 'text-[var(--color-ink)]'

  return (
    <li
      className={`flex justify-between gap-3 ${bold ? 'border-t border-[rgb(34_34_34/0.1)] pt-2 font-bold' : ''}`}
    >
      <span className={bold ? 'text-[var(--color-ink)]' : 'text-[var(--color-faint)]'}>{label}</span>
      <span className={`num ${color}`}>
        {value < 0 ? `−${formatBaht(-value)}` : formatBaht(value)}
      </span>
    </li>
  )
}
