import {chmodSync, readdirSync, renameSync, unlinkSync, writeFileSync} from 'node:fs'
import {basename, dirname, join} from 'node:path'
import type {Command} from 'commander'
import pkg from '../../package.json' with {type: 'json'}
import {verifyChecksum} from '../lib/update-checksum'
import {platformAsset} from '../lib/update-platform'

const REPO = 'shipload/toolkit'
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=100`
const TAG_PREFIX = 'cli-v'
const UA = 'shiploadcli'

async function httpsGet(url: string, headers: Record<string, string> = {}): Promise<Uint8Array> {
    if (process.platform === 'darwin') {
        const args = ['curl', '-sfL', '--user-agent', UA]
        for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`)
        args.push(url)
        const proc = Bun.spawnSync(args, {stdout: 'pipe', stderr: 'pipe'})
        if (proc.exitCode !== 0) throw new Error(`request failed (curl exit ${proc.exitCode})`)
        return proc.stdout
    }
    const res = await fetch(url, {headers: {'User-Agent': UA, ...headers}})
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    return new Uint8Array(await res.arrayBuffer())
}

interface GithubAsset {
    name: string
    browser_download_url: string
}

interface GithubRelease {
    tag_name: string
    html_url: string
    assets: GithubAsset[]
}

const SIDECAR_PREFIX = '.shiploadcli-old-'

function installBinary(tmp: string, self: string, selfDir: string, selfName: string): void {
    try {
        renameSync(tmp, self)
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EPERM') throw err
        const sidecar = join(selfDir, `${SIDECAR_PREFIX}${selfName}-${Date.now()}`)
        renameSync(self, sidecar)
        renameSync(tmp, self)
    }
}

function cleanupSidecars(selfDir: string): void {
    let entries: string[]
    try {
        entries = readdirSync(selfDir)
    } catch {
        return
    }
    for (const entry of entries) {
        if (!entry.startsWith(SIDECAR_PREFIX)) continue
        try {
            unlinkSync(join(selfDir, entry))
        } catch {}
    }
}

export function register(program: Command): void {
    program
        .command('update')
        .description('Download and install the latest release from GitHub')
        .option('--check', 'check for updates without installing')
        .action(async (opts: {check?: boolean}) => {
            const fail = (msg: string) => {
                console.error(msg)
                process.exitCode = 1
            }

            if (basename(process.execPath).startsWith('bun')) {
                fail('Run as a compiled binary to self-update.')
                return
            }

            console.log('Checking for updates...')

            let release: GithubRelease
            try {
                const buf = await httpsGet(RELEASES_API, {Accept: 'application/vnd.github+json'})
                const releases = JSON.parse(new TextDecoder().decode(buf)) as GithubRelease[]
                const found = releases.find((r) => r.tag_name.startsWith(TAG_PREFIX))
                if (!found) {
                    fail(
                        `No ${TAG_PREFIX}* release found in the most recent 100 releases — see https://github.com/${REPO}/releases`
                    )
                    return
                }
                release = found
            } catch (err) {
                fail(`Failed to fetch release info: ${(err as Error).message}`)
                return
            }

            const latest = release.tag_name.replace(/^cli-v/, '')
            const current = pkg.version

            if (latest === current) {
                console.log(`Already up to date (v${current}).`)
                return
            }

            console.log(`Update available: v${current} → v${latest}`)

            if (opts.check) return

            let assetInfo: ReturnType<typeof platformAsset>
            try {
                assetInfo = platformAsset(process.platform, process.arch)
            } catch (err) {
                fail((err as Error).message)
                return
            }

            const asset = release.assets.find((a) => a.name === assetInfo.name)
            if (!asset) {
                fail(`Asset not found: ${assetInfo.name} — see ${release.html_url}`)
                return
            }

            const sumsAsset = release.assets.find((a) => a.name === 'SHA256SUMS')
            if (!sumsAsset) {
                fail(`SHA256SUMS not found in release — see ${release.html_url}`)
                return
            }

            console.log(`Downloading ${asset.name}...`)

            let assetBuf: Uint8Array
            let sha256sums: string
            try {
                const [assetData, sumsData] = await Promise.all([
                    httpsGet(asset.browser_download_url),
                    httpsGet(sumsAsset.browser_download_url),
                ])
                assetBuf = assetData
                sha256sums = new TextDecoder().decode(sumsData)
            } catch (err) {
                fail(`Download failed: ${(err as Error).message}`)
                return
            }

            if (!verifyChecksum(assetBuf, sha256sums, assetInfo.name)) {
                fail('Checksum verification failed.')
                return
            }

            const self = process.execPath
            const selfDir = dirname(self)
            const selfName = basename(self)
            let binary: Uint8Array

            try {
                if (assetInfo.entryInZip) {
                    const zipTmp = join(selfDir, `.shiploadcli-zip-${Date.now()}`)
                    writeFileSync(zipTmp, assetBuf)
                    const proc = Bun.spawnSync(['unzip', '-p', zipTmp, assetInfo.entryInZip], {
                        stdout: 'pipe',
                        stderr: 'pipe',
                    })
                    unlinkSync(zipTmp)
                    if (proc.exitCode !== 0) {
                        fail('Failed to extract update archive.')
                        return
                    }
                    binary = proc.stdout
                } else {
                    binary = assetBuf
                }

                const tmp = join(selfDir, `.shiploadcli-update-${Date.now()}`)
                writeFileSync(tmp, binary)
                chmodSync(tmp, 0o755)
                installBinary(tmp, self, selfDir, selfName)
                cleanupSidecars(selfDir)
            } catch (err) {
                fail(`Install failed: ${(err as Error).message}`)
                return
            }

            console.log(`Updated to v${latest}.`)
        })
}
