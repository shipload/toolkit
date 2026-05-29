import {Resvg, initWasm} from '@resvg/resvg-wasm'
import resvgWasm from './assets/resvg.wasm'
import {embedFontsInSvg, type FontKey} from '@shipload/item-renderer/fonts'
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
    'inter-400': new Uint8Array(inter400),
    'inter-600': new Uint8Array(inter600),
    'jetbrains-500': new Uint8Array(jetbrains500),
}

const MIN_SCALE = 1
const MAX_SCALE = 3

// Integer pixel-density multiplier in [1, 3]. Non-finite/out-of-range coerce to 1.
export function clampScale(scale: number): number {
    if (!Number.isFinite(scale)) return 1
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(scale)))
}

export async function renderPng(svg: string, scale = 1): Promise<Uint8Array> {
    await ensureWasm()
    const s = clampScale(scale)
    const svgWithFonts = embedFontsInSvg(svg, FONT_DATA)
    const resvg = new Resvg(svgWithFonts, {
        font: {
            loadSystemFonts: false,
            fontBuffers: Object.values(FONT_DATA),
        },
        // Omit fitTo at 1x so default-density output stays byte-identical.
        ...(s !== 1 ? {fitTo: {mode: 'zoom' as const, value: s}} : {}),
    })
    return resvg.render().asPng()
}
