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
    <div className="skel" role="status" aria-live="polite" aria-busy="true">
      <p className="skel__label">
        <span className="skel__pix" aria-hidden />
        {LABELS[variant]}
      </p>

      {variant === 'boot' && (
        <>
          <div className="skel__block skel__block--lg" />
          <div className="skel__block skel__block--md" />
          <div className="skel__row">
            <div className="skel__chip" />
            <div className="skel__chip" />
            <div className="skel__chip" />
            <div className="skel__chip" />
          </div>
        </>
      )}

      {(variant === 1 || variant === 2 || variant === 3) && (
        <>
          <div className="skel__panel">
            <div className="skel__block skel__block--sm" />
            <div className="skel__block skel__block--md" />
            <div className="skel__block skel__block--xs" />
          </div>
          <div className="skel__block skel__block--sm" />
          <div className="skel__row">
            <div className="skel__choice" />
            <div className="skel__choice" />
          </div>
          <div className="skel__block skel__block--sm" />
          <div className="skel__row">
            <div className="skel__choice" />
            <div className="skel__choice" />
            <div className="skel__choice" />
          </div>
          {variant !== 1 && (
            <>
              <div className="skel__block skel__block--bar" />
              <div className="skel__block skel__block--bar" />
            </>
          )}
          <div className="skel__btn" />
        </>
      )}

      {variant === 4 && (
        <>
          <div className="skel__block skel__block--sm" />
          <div className="skel__block skel__block--hero" />
          <div className="skel__row">
            <div className="skel__stat" />
            <div className="skel__stat" />
          </div>
          <div className="skel__panel">
            <div className="skel__block skel__block--xs" />
            <div className="skel__block skel__block--md" />
            <div className="skel__block skel__block--sm" />
          </div>
          <div className="skel__btn" />
        </>
      )}

      <span className="sr-only">กำลังโหลด</span>
    </div>
  )
}
