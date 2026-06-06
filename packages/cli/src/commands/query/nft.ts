import {
    type AtomicAssetRow,
    type AtomicSchemaRow,
    type DecodedAtomicAsset,
    decodeAtomicAsset,
    displayName,
    fetchAtomicAssetsForOwner,
    fetchAtomicSchemas,
    formatMass,
    getItem,
    resolveItem,
    type ServerTypes,
    SHIPLOAD_COLLECTION,
} from '@shipload/sdk'
import Table from 'cli-table3'
import type {Command} from 'commander'
import {parseUint32} from '../../lib/args'
import {atomicAssetsContractName, client, server} from '../../lib/client'
import {formatItem, jsonStringify} from '../../lib/format'
import {formatItemStats} from '../../lib/item-stats'
import {getAccountName} from '../../lib/session'
import {buildClaimCommand} from '../action/nft-claim'
import {buildDeployCommand} from '../action/nft-deploy'
import {buildUnwrapCommand} from '../action/nft-unwrap'

interface NftRow {
    asset_id: bigint
    schema_name: string
    template_id: number
    item_id: number
    quantity: number
    mass: number
    stats: bigint
    origin_x: bigint
    origin_y: bigint
    modules?: DecodedAtomicAsset['modules']
}

async function loadNftConfig(): Promise<Map<number, number>> {
    const rows = (await server.table('nftconfig').all()) as unknown as ServerTypes.nftconfig_row[]
    const templateToItem = new Map<number, number>()
    for (const row of rows) {
        templateToItem.set(row.template_id.toNumber(), row.item_id.toNumber())
    }
    return templateToItem
}

function indexSchemas(schemas: AtomicSchemaRow[]): Map<string, AtomicSchemaRow> {
    const m = new Map<string, AtomicSchemaRow>()
    for (const s of schemas) m.set(String(s.schema_name), s)
    return m
}

function toRow(asset: AtomicAssetRow, schema: AtomicSchemaRow, itemId: number): NftRow {
    const decoded = decodeAtomicAsset(asset, schema.format, itemId)
    const item = getItem(itemId)
    return {
        asset_id: decoded.asset_id,
        schema_name: decoded.schema_name,
        template_id: decoded.template_id,
        item_id: decoded.item_id,
        quantity: decoded.quantity,
        mass: item.mass * decoded.quantity,
        stats: BigInt(decoded.stats),
        origin_x: decoded.origin_x,
        origin_y: decoded.origin_y,
        modules: decoded.modules,
    }
}

export async function fetchNftRows(owner: string): Promise<NftRow[]> {
    const [assets, schemas, templateMap] = await Promise.all([
        fetchAtomicAssetsForOwner(client, owner, {
            collection: SHIPLOAD_COLLECTION,
            account: atomicAssetsContractName,
        }),
        fetchAtomicSchemas(client, SHIPLOAD_COLLECTION, atomicAssetsContractName),
        loadNftConfig(),
    ])
    const schemaByName = indexSchemas(schemas)
    const rows: NftRow[] = []
    for (const asset of assets) {
        const itemId = templateMap.get(Number(asset.template_id))
        if (itemId === undefined) continue
        const schema = schemaByName.get(String(asset.schema_name))
        if (!schema) continue
        try {
            rows.push(toRow(asset, schema, itemId))
        } catch {
            // skip undecodable assets rather than failing the whole listing
        }
    }
    rows.sort((a, b) => (a.asset_id < b.asset_id ? -1 : a.asset_id > b.asset_id ? 1 : 0))
    return rows
}

function formatStatsField(itemId: number, stats: bigint): string {
    const formatted = formatItemStats(itemId, stats)
    if (formatted) return formatted
    if (stats === 0n) return ''
    try {
        const r = resolveItem(itemId, stats)
        return displayName(r)
    } catch {
        return String(stats)
    }
}

export function renderPretty(owner: string, rows: NftRow[]): string {
    if (rows.length === 0) {
        return `NFTs (${owner}): none in collection '${SHIPLOAD_COLLECTION}'.`
    }
    const table = new Table({
        head: ['Asset ID', 'Item', 'Qty', 'Mass', 'Origin', 'Stats', 'Schema', 'Template'],
        colAligns: ['right', 'left', 'right', 'right', 'right', 'left', 'left', 'right'],
        chars: {
            top: '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            bottom: '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            left: '  ',
            'left-mid': '',
            mid: '',
            'mid-mid': '',
            right: '',
            'right-mid': '',
            middle: '  ',
        },
        style: {head: [], border: [], 'padding-left': 0, 'padding-right': 0},
    })

    for (const r of rows) {
        table.push([
            String(r.asset_id),
            formatItem(r.item_id),
            String(r.quantity),
            formatMass(r.mass),
            `(${r.origin_x}, ${r.origin_y})`,
            formatStatsField(r.item_id, r.stats),
            r.schema_name,
            String(r.template_id),
        ])
    }

    const body = table
        .toString()
        .split('\n')
        .map((l) => l.trimEnd())
        .join('\n')
    return [`NFTs for ${owner} (${rows.length}):`, body].join('\n')
}

function rowsToJson(owner: string, rows: NftRow[]): unknown {
    return {
        owner,
        collection: SHIPLOAD_COLLECTION,
        count: rows.length,
        assets: rows.map((r) => ({
            asset_id: String(r.asset_id),
            item_id: r.item_id,
            quantity: r.quantity,
            mass: r.mass,
            stats: r.stats.toString(),
            origin: {x: r.origin_x.toString(), y: r.origin_y.toString()},
            schema_name: r.schema_name,
            template_id: r.template_id,
            modules: r.modules,
        })),
    }
}

export function register(program: Command): void {
    const nft = program
        .command('nft')
        .description(`List Shipload NFTs owned by an account (collection '${SHIPLOAD_COLLECTION}')`)
        .argument('[account]', 'account to inspect (defaults to configured actor)')
        .option('--item <id>', 'filter by item id', parseUint32)
        .option('--json', 'emit JSON instead of formatted text')
        .action(
            async (
                account: string | undefined,
                opts: {item?: number; json?: boolean}
            ): Promise<void> => {
                const owner = account ?? getAccountName()
                let rows = await fetchNftRows(owner)
                if (opts.item !== undefined) rows = rows.filter((r) => r.item_id === opts.item)
                if (opts.json) {
                    console.log(jsonStringify(rowsToJson(owner, rows)))
                } else {
                    console.log(renderPretty(owner, rows))
                }
            }
        )
    nft.addCommand(buildDeployCommand())
    nft.addCommand(buildUnwrapCommand())
    nft.addCommand(buildClaimCommand())
}
