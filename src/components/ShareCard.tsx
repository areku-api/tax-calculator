import { useMemo, useRef, useState } from 'react'
import {
  customTierSrc,
  resolveWealthTier,
  type WealthTier,
} from '../characters/tiers'
import type { TaxResult } from '../engine'
import {
  buildShareLine,
  copyText,
  marginalRate,
  siteUrl,
} from '../lib/shareLine'

type Gender = 'male' | 'female'

type Props = {
  result: TaxResult
  selfGender: Gender
  maritalStatus: 'single' | 'married'
  partnerGender: Gender | null
  partnerTier: Extract<WealthTier, 4 | 5> | null
  spouseHasIncome: boolean
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`load fail: ${src}`))
    img.src = src
  })
}

/** Gen Z captions for Stories only — not used in-app vibe text */
const STORY_CAPTION: Record<WealthTier, string> = {
  0: 'ยังไม่เริ่มเลยว่ะ ใส่เลขมาก่อนเดี๋ยวรู้เรื่อง',
  1: 'เห้ออ โล่งจัง ปีนี้แทบไม่โดน 🙏',
  2: 'เริ่มมีเสียงแล้ว… ภาษีแอบกระซิบข้างหู',
  3: 'โอเค เริ่มเจ็บแล้ววว ลดหย่อนไว้ช่วยได้',
  4: 'ไฮโซแล้วว แต่เงินก็ไหลออกทางภาษีเหมือนกัน',
  5: 'เลเวลท็อปของแมพนี้ ดูแลลดหย่อนดี ๆ นะ',
}

function storyCaption(tier: WealthTier, rate: number): string {
  if (rate === 0 && tier >= 1) return 'เห้ออ โล่งจัง ปีนี้ไม่เสียภาษีเลยว่ะ'
  return STORY_CAPTION[tier]
}

function gaugeAccent(rate: number): string {
  if (rate >= 30) return '#e84d5b'
  if (rate >= 20) return '#f0a03a'
  if (rate >= 10) return '#f0c93a'
  if (rate >= 5) return '#7ddf6a'
  return '#5ecf8b'
}

/** Story card 1080×1920 — character + level only (no baht) */
async function buildSharePng(opts: {
  tier: WealthTier
  title: string
  vibe: string
  rate: number
  selfGender: Gender
  showCouple: boolean
  partner: Gender
  partnerTier: WealthTier
}): Promise<Blob> {
  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')

  await document.fonts.ready
  ctx.textAlign = 'center'

  // —— background + patterns ——
  const g = ctx.createLinearGradient(0, 0, W * 0.2, H)
  g.addColorStop(0, '#152028')
  g.addColorStop(0.4, '#243840')
  g.addColorStop(0.75, '#1e2a32')
  g.addColorStop(1, '#0f161c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // pixel grid
  ctx.strokeStyle = 'rgba(62, 207, 142, 0.07)'
  ctx.lineWidth = 2
  const grid = 48
  for (let x = 0; x <= W; x += grid) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y <= H; y += grid) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // diagonal hatch stripes
  ctx.save()
  ctx.strokeStyle = 'rgba(126, 184, 212, 0.06)'
  ctx.lineWidth = 3
  for (let i = -H; i < W + H; i += 56) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + H, H)
    ctx.stroke()
  }
  ctx.restore()

  // floating dots
  ctx.fillStyle = 'rgba(62, 207, 142, 0.18)'
  const dots = [
    [90, 240],
    [980, 320],
    [140, 1500],
    [920, 1600],
    [200, 700],
    [860, 780],
    [70, 1100],
    [1000, 1180],
  ]
  for (const [dx, dy] of dots) {
    ctx.beginPath()
    ctx.arc(dx, dy, 10 + ((dx + dy) % 14), 0, Math.PI * 2)
    ctx.fill()
  }

  // accent glow behind character
  const glow = ctx.createRadialGradient(W / 2, H * 0.36, 20, W / 2, H * 0.36, 480)
  glow.addColorStop(0, 'rgba(62, 207, 142, 0.35)')
  glow.addColorStop(0.45, 'rgba(240, 160, 58, 0.08)')
  glow.addColorStop(1, 'rgba(62, 207, 142, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // brand
  ctx.fillStyle = '#e8f4ef'
  ctx.font = '700 52px Prompt, Anuphan, sans-serif'
  ctx.fillText('โดนกี่บาท', W / 2, 160)
  ctx.fillStyle = '#7ddf6a'
  ctx.font = '600 28px Prompt, Anuphan, sans-serif'
  ctx.fillText('สรุปตัวละคร', W / 2, 210)

  // character(s) — same feet baseline, tucked close
  const selfSrc = customTierSrc(opts.tier, opts.selfGender)
  const selfImg = await loadImage(selfSrc)
  const floorY = 820
  const selfH = opts.showCouple ? 460 : 520
  const selfW = (selfImg.width / selfImg.height) * selfH
  ctx.imageSmoothingEnabled = false

  if (opts.showCouple) {
    const pSrc = customTierSrc(opts.partnerTier, opts.partner)
    const pImg = await loadImage(pSrc)
    const partnerScale = 0.9
    const partnerH = selfH * partnerScale
    const partnerW = (pImg.width / pImg.height) * partnerH
    // overlap so they stand as one party
    const overlap = selfW * 0.22
    const totalW = selfW + partnerW - overlap
    const xSelf = (W - totalW) / 2
    const xPartner = xSelf + selfW - overlap
    const ySelf = floorY - selfH
    const yPartner = floorY - partnerH

    // ground shadow under pair
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.beginPath()
    ctx.ellipse(W / 2, floorY + 8, totalW * 0.42, 28, 0, 0, Math.PI * 2)
    ctx.fill()

    // partner slightly behind, self in front
    ctx.globalAlpha = 0.98
    ctx.drawImage(pImg, xPartner, yPartner, partnerW, partnerH)
    ctx.globalAlpha = 1
    ctx.drawImage(selfImg, xSelf, ySelf, selfW, selfH)
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.ellipse(W / 2, floorY + 8, selfW * 0.42, 26, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.drawImage(selfImg, (W - selfW) / 2, floorY - selfH, selfW, selfH)
  }

  // level badge
  const badgeY = 860
  ctx.fillStyle = '#3ecf8e'
  roundRect(ctx, W / 2 - 120, badgeY, 240, 64, 12)
  ctx.fill()
  ctx.fillStyle = '#1e2a32'
  ctx.font = '800 36px Prompt, Anuphan, sans-serif'
  ctx.fillText(`LV.${opts.tier}`, W / 2, badgeY + 44)

  // title + Gen Z story caption (Stories only)
  ctx.fillStyle = '#f4fcf8'
  ctx.font = '800 64px Prompt, Anuphan, sans-serif'
  ctx.fillText(opts.title, W / 2, 990)

  const caption = storyCaption(opts.tier, opts.rate)
  ctx.fillStyle = '#cfe8de'
  ctx.font = '600 34px Prompt, Anuphan, sans-serif'
  wrapText(ctx, caption, W / 2, 1055, W - 180, 46)

  // —— epic circular power dial ——
  const accent = gaugeAccent(opts.rate)
  const cx = W / 2
  const cy = 1385
  const outerR = 210
  const fillPct = Math.min(1, opts.rate / 35)
  const start = -Math.PI / 2
  const end = start + Math.PI * 2 * fillPct

  // outer glow
  ctx.save()
  ctx.globalAlpha = 0.28
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(cx, cy, outerR + 55, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // dark ring base
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.strokeStyle = '#0f161c'
  ctx.lineWidth = 36
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.strokeStyle = '#3d5260'
  ctx.lineWidth = 6
  ctx.stroke()

  // tick marks around ring
  for (let i = 0; i <= 7; i++) {
    const a = start + (Math.PI * 2 * i) / 7
    const r0 = outerR - 28
    const r1 = outerR + 10
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
    ctx.strokeStyle = i / 7 <= fillPct + 0.01 ? accent : '#5a6e7c'
    ctx.lineWidth = 4
    ctx.stroke()
  }

  // filled arc
  if (fillPct > 0) {
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, start, end)
    ctx.strokeStyle = accent
    ctx.lineWidth = 28
    ctx.lineCap = 'round'
    ctx.shadowColor = accent
    ctx.shadowBlur = 28
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.lineCap = 'butt'
  }

  // inner core
  ctx.beginPath()
  ctx.arc(cx, cy, 128, 0, Math.PI * 2)
  ctx.fillStyle = '#152028'
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.fillStyle = '#9bb0be'
  ctx.font = '700 26px Prompt, Anuphan, sans-serif'
  ctx.fillText('เกจพลังภาษี', cx, cy - 28)
  ctx.fillStyle = accent
  ctx.font = '800 84px Prompt, Anuphan, sans-serif'
  ctx.fillText(`${opts.rate}%`, cx, cy + 48)

  // footer
  ctx.fillStyle = '#5a6e7c'
  ctx.font = '600 26px Prompt, Anuphan, sans-serif'
  ctx.fillText('ลองของตัวเองได้ที่โดนกี่บาท', W / 2, 1720)
  ctx.fillStyle = '#3ecf8e'
  ctx.font = '700 24px Prompt, Anuphan, sans-serif'
  ctx.fillText('#โดนกี่บาท  #ภาษี2569', W / 2, 1780)

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) throw new Error('toBlob failed')
  return blob
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = [...text]
  let line = ''
  let yy = y
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy)
      line = ch
      yy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, yy)
}

export function ShareCard({
  result,
  selfGender,
  maritalStatus,
  partnerGender,
  partnerTier,
  spouseHasIncome,
}: Props) {
  const info = useMemo(() => resolveWealthTier(result), [result])
  const rate = useMemo(() => marginalRate(result), [result])
  const showCouple = maritalStatus === 'married'
  const partner: Gender =
    partnerGender ?? (selfGender === 'male' ? 'female' : 'male')
  const displayPartnerTier: WealthTier =
    spouseHasIncome && partnerTier != null ? partnerTier : info.tier

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState<'line' | 'url' | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const shareLine = useMemo(() => buildShareLine(result), [result])

  async function makeBlob() {
    return buildSharePng({
      tier: info.tier,
      title: info.title,
      vibe: info.vibe,
      rate,
      selfGender,
      showCouple,
      partner,
      partnerTier: displayPartnerTier,
    })
  }

  async function download() {
    setBusy(true)
    setErr(null)
    try {
      const blob = await makeBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `donkeebaht-lv${info.tier}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErr('สร้างรูปไม่สำเร็จ ลองรีเฟรชแล้วทำใหม่')
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    setBusy(true)
    setErr(null)
    try {
      const blob = await makeBlob()
      const file = new File([blob], `donkeebaht-lv${info.tier}.png`, {
        type: 'image/png',
      })
      const text = `${shareLine}\nลองคำนวณที่ ${siteUrl()}`
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'โดนกี่บาท',
          text,
        })
      } else {
        await download()
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setErr('แชร์ไม่ได้บนเครื่องนี้ — ลองกดบันทึกรูปแทน')
    } finally {
      setBusy(false)
    }
  }

  async function copyLine() {
    const ok = await copyText(`${shareLine}\n${siteUrl()}`)
    if (ok) {
      setCopied('line')
      window.setTimeout(() => setCopied(null), 1800)
    } else {
      setErr('คัดลอกไม่สำเร็จ ลองกดค้างเลือกข้อความเอง')
    }
  }

  async function copyUrl() {
    const ok = await copyText(siteUrl())
    if (ok) {
      setCopied('url')
      window.setTimeout(() => setCopied(null), 1800)
    } else {
      setErr('คัดลอกลิงก์ไม่สำเร็จ')
    }
  }

  return (
    <section className="share-card panel space-y-3 p-4">
      <header className="space-y-1">
        <h3 className="text-base font-bold text-[var(--color-ink)]">แชร์สรุปตัวละคร</h3>
        <p className="text-xs leading-relaxed text-[var(--color-muted)]">
          โชว์ตัวละคร + เลเวล + แถบพลัง (%) อย่างเดียว · ไม่ติดยอดเงิน
          เซฟไปลง Stories / IG / Facebook ได้
        </p>
      </header>

      <div className="share-line">
        <p className="share-line__text">{shareLine}</p>
        <div className="share-line__actions">
          <button type="button" className="btn-ghost share-line__btn" onClick={() => void copyLine()}>
            {copied === 'line' ? 'คัดลอกแล้ว ✓' : 'คัดลอกสรุป'}
          </button>
          <button type="button" className="btn-ghost share-line__btn" onClick={() => void copyUrl()}>
            {copied === 'url' ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์เว็บ'}
          </button>
        </div>
      </div>

      <div ref={previewRef} className="share-card__preview" aria-hidden>
        <div className="share-card__stage">
          <img
            src={customTierSrc(info.tier, selfGender)}
            alt=""
            className="share-card__sprite"
          />
          {showCouple && (
            <img
              src={customTierSrc(displayPartnerTier, partner)}
              alt=""
              className="share-card__sprite share-card__sprite--partner"
            />
          )}
        </div>
        <p className="share-card__lv">LV.{info.tier}</p>
        <p className="share-card__title">{info.title}</p>
        <p className="share-card__caption">{storyCaption(info.tier, rate)}</p>
        <p className="share-card__rate">ขั้น {rate}%</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={busy}
          onClick={() => void share()}
        >
          {busy ? 'กำลังทำรูป…' : 'แชร์ / บันทึกรูป Stories'}
        </button>
        <button
          type="button"
          className="btn-ghost flex-1"
          disabled={busy}
          onClick={() => void download()}
        >
          ดาวน์โหลด PNG
        </button>
      </div>
      {err && <p className="text-xs text-[var(--color-expense)]">{err}</p>}
    </section>
  )
}
