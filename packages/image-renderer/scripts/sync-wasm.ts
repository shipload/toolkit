#!/usr/bin/env bun
import {copyFileSync, existsSync, mkdirSync, statSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const workerRoot = resolve(scriptDir, '..')
const require = createRequire(import.meta.url)
const resvgRoot = dirname(require.resolve('@resvg/resvg-wasm/package.json'))
const src = resolve(resvgRoot, 'index_bg.wasm')
const workerAssetsDir = resolve(workerRoot, 'src/assets')
const dst = join(workerAssetsDir, 'resvg.wasm')

if (!existsSync(src)) {
    console.error(`[sync-wasm] source missing: ${src}`)
    process.exit(1)
}

if (!existsSync(workerAssetsDir)) {
    mkdirSync(workerAssetsDir, {recursive: true})
}

const srcStat = statSync(src)
const dstStat = existsSync(dst) ? statSync(dst) : null
if (!dstStat || dstStat.size !== srcStat.size || dstStat.mtimeMs < srcStat.mtimeMs) {
    copyFileSync(src, dst)
    console.log(`[sync-wasm] resvg.wasm  (${srcStat.size} B)`)
} else {
    console.log(`[sync-wasm] resvg.wasm up to date`)
}
