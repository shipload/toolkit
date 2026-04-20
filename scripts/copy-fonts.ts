import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../src/fonts')
const NM = resolve(__dirname, '../node_modules')

const FACES = [
  {
    src: `${NM}/@fontsource/orbitron/files/orbitron-latin-700-normal.woff2`,
    out: 'orbitron-700.woff2',
  },
  {
    src: `${NM}/@fontsource/inter/files/inter-latin-400-normal.woff2`,
    out: 'inter-400.woff2',
  },
  {
    src: `${NM}/@fontsource/inter/files/inter-latin-600-normal.woff2`,
    out: 'inter-600.woff2',
  },
  {
    src: `${NM}/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2`,
    out: 'jetbrains-500.woff2',
  },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (const face of FACES) {
    const dest = resolve(OUT_DIR, face.out)
    await copyFile(face.src, dest)
    const size = (await Bun.file(dest).arrayBuffer()).byteLength
    console.log(`wrote ${face.out} (${size} bytes)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
