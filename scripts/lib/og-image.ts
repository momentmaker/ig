import sharp from 'sharp'

const W = 1200
const H = 630
const HEX_BOX = 480
const RING = 6
const NAVY = '#0a0e1a'
const YELLOW = '#F7B808'
const GOLD = '#d4a017'
const TEXT_COLOR = '#f7f7f0'

function hexPath(size: number): string {
  const s = size
  return `M${0.5 * s},0 L${0.933 * s},${0.25 * s} L${0.933 * s},${0.75 * s} L${0.5 * s},${s} L${0.067 * s},${0.75 * s} L${0.067 * s},${0.25 * s} Z`
}

export interface ComposeOgImageOptions {
  photoPath: string
  caption: string
  outPath: string
  solstice?: boolean
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export async function composeOgImage(opts: ComposeOgImageOptions): Promise<void> {
  const ringColor = opts.solstice === true ? GOLD : YELLOW

  const outerSvg = Buffer.from(
    `<svg width="${HEX_BOX}" height="${HEX_BOX}" xmlns="http://www.w3.org/2000/svg">
      <path d="${hexPath(HEX_BOX)}" fill="${ringColor}"/>
    </svg>`,
  )

  const innerSize = HEX_BOX - RING * 2
  const innerHexMask = Buffer.from(
    `<svg width="${innerSize}" height="${innerSize}" xmlns="http://www.w3.org/2000/svg">
      <path d="${hexPath(innerSize)}" fill="white"/>
    </svg>`,
  )

  const photoClipped = await sharp(opts.photoPath)
    .resize(innerSize, innerSize, { fit: 'cover', position: 'center' })
    .composite([{ input: innerHexMask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  const captionSvg = Buffer.from(
    `<svg width="${W}" height="80" xmlns="http://www.w3.org/2000/svg">
      <style>
        .cap { font: 28px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
               font-variant: small-caps; letter-spacing: 4px; fill: ${TEXT_COLOR}; }
      </style>
      <text x="50%" y="55%" text-anchor="middle" class="cap">${escapeXml(opts.caption)}</text>
    </svg>`,
  )

  const hexX = Math.floor((W - HEX_BOX) / 2)
  const hexY = Math.floor((H - HEX_BOX) / 2) - 20

  await sharp({
    create: { width: W, height: H, channels: 3, background: NAVY },
  })
    .composite([
      { input: outerSvg, left: hexX, top: hexY },
      { input: photoClipped, left: hexX + RING, top: hexY + RING },
      { input: captionSvg, left: 0, top: H - 90 },
    ])
    .png()
    .toFile(opts.outPath)
}
