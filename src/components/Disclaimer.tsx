import type { TaxYearConfig } from '../config'

export function Disclaimer({ cfg }: { cfg: TaxYearConfig }) {
  return (
    <p className="rounded-2xl border border-[var(--color-mid)] bg-[var(--color-soft)]/80 px-3 py-2.5 text-xs leading-relaxed text-[var(--color-muted)]">
      {cfg.disclaimer}{' '}
      <a
        href={cfg.rdUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--color-brown-deep)] underline underline-offset-2"
      >
        เช็กกับกรมสรรพากร
      </a>
    </p>
  )
}
