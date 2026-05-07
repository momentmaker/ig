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

export interface HomeOgPanel {
  photoPath: string
  label: string
  description: string
  solstice?: boolean
}

export interface ComposeHomeOgImageOptions {
  sky: HomeOgPanel
  count: HomeOgPanel
  outPath: string
  title?: string
  tagline?: string
}

const HOME_HEX_BOX = 320
const HOME_RING = 5

async function renderHexPhoto(photoPath: string, ringColor: string): Promise<Buffer> {
  const outerSvg = Buffer.from(
    `<svg width="${HOME_HEX_BOX}" height="${HOME_HEX_BOX}" xmlns="http://www.w3.org/2000/svg">
      <path d="${hexPath(HOME_HEX_BOX)}" fill="${ringColor}"/>
    </svg>`,
  )
  const innerSize = HOME_HEX_BOX - HOME_RING * 2
  const innerHexMask = Buffer.from(
    `<svg width="${innerSize}" height="${innerSize}" xmlns="http://www.w3.org/2000/svg">
      <path d="${hexPath(innerSize)}" fill="white"/>
    </svg>`,
  )
  const photoClipped = await sharp(photoPath)
    .resize(innerSize, innerSize, { fit: 'cover', position: 'center' })
    .composite([{ input: innerHexMask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  return sharp({
    create: { width: HOME_HEX_BOX, height: HOME_HEX_BOX, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: outerSvg, left: 0, top: 0 },
      { input: photoClipped, left: HOME_RING, top: HOME_RING },
    ])
    .png()
    .toBuffer()
}

export async function composeHomeOgImage(opts: ComposeHomeOgImageOptions): Promise<void> {
  const title = opts.title ?? 'ig.fz.ax'
  const tagline = opts.tagline ?? 'noticing what was previously invisible'

  const skyRing = opts.sky.solstice === true ? GOLD : YELLOW
  const countRing = opts.count.solstice === true ? GOLD : YELLOW

  const [skyHex, countHex] = await Promise.all([
    renderHexPhoto(opts.sky.photoPath, skyRing),
    renderHexPhoto(opts.count.photoPath, countRing),
  ])

  const headerSvg = Buffer.from(
    `<svg width="${W}" height="120" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font: 56px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                 letter-spacing: 2px; fill: ${TEXT_COLOR}; }
        .tag { font: 22px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
               font-style: italic; fill: ${TEXT_COLOR}; opacity: 0.78; }
      </style>
      <text x="50%" y="50" text-anchor="middle" class="title">${escapeXml(title)}</text>
      <text x="50%" y="92" text-anchor="middle" class="tag">${escapeXml(tagline)}</text>
    </svg>`,
  )

  const panelSvg = (label: string, description: string): Buffer => Buffer.from(
    `<svg width="${HOME_HEX_BOX + 80}" height="120" xmlns="http://www.w3.org/2000/svg">
      <style>
        .label { font: 28px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                 font-variant: small-caps; letter-spacing: 6px; fill: ${TEXT_COLOR}; }
        .desc { font: 20px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                fill: ${TEXT_COLOR}; opacity: 0.72; }
      </style>
      <text x="50%" y="38" text-anchor="middle" class="label">${escapeXml(label)}</text>
      <text x="50%" y="78" text-anchor="middle" class="desc">${escapeXml(description)}</text>
    </svg>`,
  )

  const gap = 80
  const totalHexW = HOME_HEX_BOX * 2 + gap
  const hexY = 150
  const skyX = Math.floor((W - totalHexW) / 2)
  const countX = skyX + HOME_HEX_BOX + gap
  const captionY = hexY + HOME_HEX_BOX + 12

  await sharp({
    create: { width: W, height: H, channels: 3, background: NAVY },
  })
    .composite([
      { input: headerSvg, left: 0, top: 20 },
      { input: skyHex, left: skyX, top: hexY },
      { input: countHex, left: countX, top: hexY },
      { input: panelSvg(opts.sky.label, opts.sky.description), left: skyX - 40, top: captionY },
      { input: panelSvg(opts.count.label, opts.count.description), left: countX - 40, top: captionY },
    ])
    .png()
    .toFile(opts.outPath)
}
