import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { Resvg } from '@resvg/resvg-js'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { resolveItem } from '@shipload/sdk'
import { renderItem } from '../src/render.ts'
import { embedFontsInSvg } from '../src/fonts/index.ts'
import { loadFontData } from '../src/fonts/load-bun.ts'
import { FIXTURES } from './fixtures/cargo-items.ts'

const SNAP_DIR = resolve(import.meta.dir, '__image_snapshots__')
const UPDATE = process.env.UPDATE_IMAGE_SNAPSHOTS === '1'

await mkdir(SNAP_DIR, { recursive: true })
const fontData = await loadFontData()

async function renderPng(svg: string): Promise<Buffer> {
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: false, fontBuffers: Object.values(fontData).map((b) => Buffer.from(b)) },
  })
  return resvg.render().asPng()
}

const CASES = [
  { name: 'resource-iron', fixture: FIXTURES.iron },
  { name: 'packed-entity-ship-t1-two-modules', fixture: FIXTURES.shipT1TwoModules },
  { name: 'packed-entity-ship-t1-mixed', fixture: FIXTURES.shipT1OneFilledOneEmpty },
] as const

for (const c of CASES) {
  test(`pixel golden — ${c.name}`, async () => {
    const resolved = resolveItem(c.fixture.item_id, c.fixture.stats, c.fixture.modules)
    const svg = embedFontsInSvg(renderItem(c.fixture, resolved), fontData)
    const png = await renderPng(svg)
    const goldPath = resolve(SNAP_DIR, `${c.name}.png`)

    if (UPDATE || !existsSync(goldPath)) {
      await writeFile(goldPath, png)
      return
    }

    const actual = PNG.sync.read(png)
    const expected = PNG.sync.read(await readFile(goldPath))
    expect(actual.width).toBe(expected.width)
    expect(actual.height).toBe(expected.height)
    const diff = new PNG({ width: actual.width, height: actual.height })
    const diffCount = pixelmatch(
      actual.data,
      expected.data,
      diff.data,
      actual.width,
      actual.height,
      { threshold: 0.1 },
    )
    if (diffCount > 10) {
      await writeFile(resolve(SNAP_DIR, `${c.name}.diff.png`), PNG.sync.write(diff))
    }
    expect(diffCount).toBeLessThanOrEqual(10)
  })
}
