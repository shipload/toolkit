import {writeFile} from 'node:fs/promises'
import type {Command} from 'commander'
import {chain} from '../../lib/client'
import {getTableRows} from '../../lib/chain-debug'
import {manifestToJSON, type SnapshotManifest} from '../../lib/snapshot-manifest'

const DEFAULT_CONTRACT = 'shipload.gm'
const PAGE_LIMIT = 1000

async function fetchAllRows(
    chainUrl: string,
    code: string,
    scope: string,
    table: string
): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = []
    let lower: string | undefined
    while (true) {
        const res = await getTableRows({
            chainUrl,
            code,
            scope,
            table,
            limit: PAGE_LIMIT,
            lower_bound: lower,
        })
        rows.push(...(res.rows as Record<string, unknown>[]))
        if (!res.more) break
        lower = res.next_key
    }
    return rows
}

export function registerSubcommand(tools: Command): void {
    tools
        .command('snapshot')
        .description('Capture all server-contract state into a JSON manifest')
        .option('--out <file>', 'output file path (default: ./snapshot-<timestamp>.json)')
        .option('--source <url>', 'override chain endpoint', String(chain.url))
        .option('--contract <account>', 'server contract account', DEFAULT_CONTRACT)
        .action(async (opts: {out?: string; source: string; contract: string}) => {
            const chainUrl = opts.source
            const scope = opts.contract

            const stateRows = await fetchAllRows(chainUrl, opts.contract, scope, 'state')
            const stateRow = stateRows[0]
            if (!stateRow) throw new Error(`No state singleton found at ${opts.contract}`)

            const epoch = Number(stateRow.epoch)

            const [nftconfig, players, entities, cargo, entitygroups, reserveScopes] =
                await Promise.all([
                    fetchAllRows(chainUrl, opts.contract, scope, 'nftconfig'),
                    fetchAllRows(chainUrl, opts.contract, scope, 'player'),
                    fetchAllRows(chainUrl, opts.contract, scope, 'entity'),
                    fetchAllRows(chainUrl, opts.contract, scope, 'cargo'),
                    fetchAllRows(chainUrl, opts.contract, scope, 'entitygroup'),
                    Promise.all(
                        Array.from({length: epoch}, (_, i) => i + 1).map(async (e) => {
                            const rows = await fetchAllRows(
                                chainUrl,
                                opts.contract,
                                String(e),
                                'reserve'
                            )
                            return {scope: e, rows}
                        })
                    ),
                ])

            const manifest: SnapshotManifest = {
                version: 1,
                capturedAt: new Date().toISOString(),
                sourceContract: opts.contract,
                chainId: String(chain.id),
                state: stateRow,
                nftconfig,
                players,
                entities,
                cargo,
                entitygroups,
                reserves: reserveScopes.filter((s) => s.rows.length > 0),
            }

            const outPath =
                opts.out ?? `./snapshot-${manifest.capturedAt.replace(/[:.]/g, '-')}.json`
            await writeFile(outPath, manifestToJSON(manifest), 'utf8')
            console.log(`Snapshot written to ${outPath}`)
            console.log(
                `  state: epoch=${epoch}, players=${manifest.players.length}, entities=${manifest.entities.length}, cargo=${manifest.cargo.length}, groups=${manifest.entitygroups.length}, reserve scopes=${manifest.reserves.length}`
            )
        })
}
