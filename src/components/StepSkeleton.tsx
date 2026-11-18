type Variant = 1 | 2 | 3 | 4 | 'boot'

const LABELS: Record<Variant, string> = {
  boot: 'กำลังเปิดเกม…',
  1: 'กำลังสร้างตัวละคร…',
  2: 'กำลังเปิดช่องใส่รายได้…',
  3: 'กำลังโหลดลดหย่อน…',
  4: 'กำลังคำนวณภาษี…',
}

export function StepSkeleton({ variant = 'boot' }: { variant?: Variant }) {
  return (
    <div className="load-spin" role="status" aria-live="polite" aria-busy="true">
      <div className="load-spin__ring" aria-hidden>
        <span className="load-spin__core" />
      </div>
      <p className="load-spin__label">{LABELS[variant]}</p>
      <span className="sr-only">กำลังโหลด</span>
    </div>
  )
}
