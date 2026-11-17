import type { TaxResult } from '../engine'
import { formatBaht } from '../engine'

export function EquationBar({ result }: { result: TaxResult }) {
  return (
    <div className="eq-bar">
      <Eq term="รายได้" value={result.grossSatang} tone="income" strong />
      <span className="eq-bar__op">−</span>
      <Eq term="ค่าใช้จ่าย" value={result.expenseSatang} tone="expense" />
      <span className="eq-bar__op">−</span>
      <Eq term="ลดหย่อน" value={result.deductionTotalSatang} tone="allowance" />
      <span className="eq-bar__op">=</span>
      <Eq term="เงินได้สุทธิ" value={result.netIncomeSatang} tone="net" strong />
    </div>
  )
}

function Eq({
  term,
  value,
  tone,
  strong,
}: {
  term: string
  value: number
  tone: 'income' | 'expense' | 'allowance' | 'net'
  strong?: boolean
}) {
  return (
    <div className={`eq-bar__term eq-bar__term--${tone} ${strong ? 'is-strong' : ''}`}>
      <span className="eq-bar__name">{term}</span>
      <span className="eq-bar__val num">{formatBaht(value)}</span>
    </div>
  )
}
