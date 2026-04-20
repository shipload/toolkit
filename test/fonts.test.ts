import { expect, test } from 'bun:test'
import { embedFontsInSvg } from '../src/fonts/index.ts'
import { loadFontData } from '../src/fonts/load-bun.ts'

test('loadFontData returns all four faces with non-zero bytes', async () => {
  const data = await loadFontData()
  expect(Object.keys(data).sort()).toEqual([
    'inter-400',
    'inter-600',
    'jetbrains-500',
    'orbitron-700',
  ])
  for (const [key, bytes] of Object.entries(data)) {
    expect(bytes.byteLength, `${key} bytes`).toBeGreaterThan(2000)
    expect(bytes.byteLength, `${key} bytes`).toBeLessThan(120_000)
  }
})

test('embedFontsInSvg inlines @font-face blocks', async () => {
  const data = await loadFontData()
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
  const out = embedFontsInSvg(svg, data)
  expect(out).toContain('@font-face')
  expect(out).toContain('font-family: "Orbitron"')
  expect(out).toContain('font-family: "Inter"')
  expect(out).toContain('font-family: "JetBrains Mono"')
  expect(out).toContain('data:font/woff2;base64,')
})
