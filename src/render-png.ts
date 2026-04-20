import { Resvg, initWasm } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import { embedFontsInSvg, type FontKey } from '@shipload/item-renderer/fonts'
import orbitron700 from './assets/orbitron-700.woff2'
import inter400 from './assets/inter-400.woff2'
import inter600 from './assets/inter-600.woff2'
import jetbrains500 from './assets/jetbrains-500.woff2'

let wasmReady: Promise<void> | null = null

async function ensureWasm(): Promise<void> {
  wasmReady ??= initWasm(resvgWasm as WebAssembly.Module)
  return wasmReady
}

function toBytes(buf: ArrayBuffer | Uint8Array): Uint8Array {
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf)
}

const FONT_DATA: Record<FontKey, Uint8Array> = {
  'orbitron-700': toBytes(orbitron700 as unknown as ArrayBuffer),
  'inter-400':    toBytes(inter400    as unknown as ArrayBuffer),
  'inter-600':    toBytes(inter600    as unknown as ArrayBuffer),
  'jetbrains-500': toBytes(jetbrains500 as unknown as ArrayBuffer),
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
