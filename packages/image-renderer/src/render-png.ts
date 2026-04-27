import { Resvg, initWasm } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { embedFontsInSvg, type FontKey } from '@shipload/item-renderer/fonts'
import orbitron700 from './assets/orbitron-700.woff2'
import inter400 from './assets/inter-400.woff2'
import inter600 from './assets/inter-600.woff2'
import jetbrains500 from './assets/jetbrains-500.woff2'

let wasmReady: Promise<void> | null = null

async function ensureWasm(): Promise<void> {
  wasmReady ??= initWasm(resvgWasm).catch((e) => {
    wasmReady = null
    throw e
  })
  return wasmReady
}

const FONT_DATA: Record<FontKey, Uint8Array> = {
  'orbitron-700': new Uint8Array(orbitron700),
  'inter-400':    new Uint8Array(inter400),
  'inter-600':    new Uint8Array(inter600),
  'jetbrains-500': new Uint8Array(jetbrains500),
}

export async function renderPng(svg: string): Promise<Uint8Array> {
  await ensureWasm()
  const svgWithFonts = embedFontsInSvg(svg, FONT_DATA)
  const resvg = new Resvg(svgWithFonts, {
    font: {
      loadSystemFonts: false,
      fontBuffers: Object.values(FONT_DATA),
    },
  })
  return resvg.render().asPng()
}
