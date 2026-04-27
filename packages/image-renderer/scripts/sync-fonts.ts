#!/usr/bin/env bun
import { readdirSync, copyFileSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const workerRoot = resolve(scriptDir, '..')
const require = createRequire(import.meta.url)
const rendererRoot = dirname(require.resolve('@shipload/item-renderer/package.json'))
const rendererFontsDir = resolve(rendererRoot, 'src/fonts')
const workerAssetsDir = resolve(workerRoot, 'src/assets')

if (!existsSync(rendererFontsDir)) {
  console.error(`[sync-fonts] renderer fonts dir missing: ${rendererFontsDir}`)
  process.exit(1)
}

if (!existsSync(workerAssetsDir)) {
  mkdirSync(workerAssetsDir, { recursive: true })
}

const woff2 = readdirSync(rendererFontsDir).filter((f) => f.endsWith('.woff2'))
if (woff2.length === 0) {
  console.error(`[sync-fonts] no .woff2 files found in ${rendererFontsDir}`)
  process.exit(1)
}

let updated = 0
for (const file of woff2) {
  const src = join(rendererFontsDir, file)
  const dst = join(workerAssetsDir, file)
  const srcStat = statSync(src)
  const dstStat = existsSync(dst) ? statSync(dst) : null
  if (!dstStat || dstStat.size !== srcStat.size || dstStat.mtimeMs < srcStat.mtimeMs) {
    copyFileSync(src, dst)
    updated++
    console.log(`[sync-fonts] ${file}  (${srcStat.size} B)`)
  }
}
console.log(`[sync-fonts] ${updated} file(s) updated, ${woff2.length} checked`)
