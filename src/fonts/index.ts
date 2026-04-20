export type FontKey = 'orbitron-700' | 'inter-400' | 'inter-600' | 'jetbrains-500'

export interface FontMeta {
  family: string
  weight: number
  fileName: string
}

export const FONT_MANIFEST: Record<FontKey, FontMeta> = {
  'orbitron-700': { family: 'Orbitron', weight: 700, fileName: 'orbitron-700.woff2' },
  'inter-400': { family: 'Inter', weight: 400, fileName: 'inter-400.woff2' },
  'inter-600': { family: 'Inter', weight: 600, fileName: 'inter-600.woff2' },
  'jetbrains-500': { family: 'JetBrains Mono', weight: 500, fileName: 'jetbrains-500.woff2' },
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

export function embedFontsInSvg(
  svg: string,
  fontData: Record<FontKey, Uint8Array>,
): string {
  const faceBlocks = (Object.keys(fontData) as FontKey[]).map((key) => {
    const meta = FONT_MANIFEST[key]
    const b64 = bytesToBase64(fontData[key])
    return (
      `@font-face { font-family: "${meta.family}"; font-weight: ${meta.weight}; ` +
      `font-style: normal; src: url(data:font/woff2;base64,${b64}) format("woff2"); }`
    )
  }).join('\n')
  const style = `<defs><style type="text/css"><![CDATA[\n${faceBlocks}\n]]></style></defs>`
  return svg.replace('>', `>${style}`)
}
