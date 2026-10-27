import {Serializer} from '@wharfkit/antelope'
import {getItem} from '../data/catalog'
import {Types as ServerTypes} from '../contracts/server'
import {buildEntityLoadout} from './description'
import {getWrappedSchema} from './schemas'

export type AtomicAttributeType =
    | 'string'
    | 'uint8'
    | 'uint16'
    | 'uint32'
    | 'uint64'
    | 'int32'
    | 'UINT16_VEC'
    | 'UINT64_VEC'

export interface ImmutableEntry {
    first: string
    second: [AtomicAttributeType, unknown]
}

export interface ImmutableModuleSlot {
    type?: number | string | bigint
    installed?: {item_id: number | string | bigint; stats: number | string | bigint}
}

export function moduleSlotsForImmutable(
    modules: ServerTypes.module_entry[]
): ImmutableModuleSlot[] {
    return modules.map((m) => ({
        type: Number(m.type.toString()),
        installed: m.installed
            ? {
                  item_id: Number(m.installed.item_id.toString()),
                  stats: BigInt(m.installed.stats.toString()),
              }
            : undefined,
    }))
}

const IMAGE_HOST_URL = 'https://item.shiploadgame.com/item'

function bytesToBase64Url(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
    const b64 = btoa(binary)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function computeNftImageUrl(
    item: {item_id: number; stats: bigint; modules: ImmutableModuleSlot[]; quantity: number},
    originX: number,
    originY: number
): string {
    const payload = ServerTypes.nft_item_payload.from({
        item: {
            item_id: item.item_id,
            stats: String(item.stats),
            modules: item.modules,
            quantity: item.quantity,
        },
        location: {x: String(originX), y: String(originY)},
    })
    const bytes = Serializer.encode({object: payload}).array
    return `${IMAGE_HOST_URL}/${bytesToBase64Url(bytes)}.png`
}

const ATTRIBUTE_TYPE_BY_FIELD_TYPE: Record<string, AtomicAttributeType> = {
    string: 'string',
    image: 'string',
    uint8: 'uint8',
    uint16: 'uint16',
    uint32: 'uint32',
    uint64: 'uint64',
    int32: 'int32',
    'uint16[]': 'UINT16_VEC',
    'uint64[]': 'UINT64_VEC',
}

export function buildImmutableData(
    itemId: number,
    quantity: number,
    stats: bigint,
    originX: number,
    originY: number,
    modules: ImmutableModuleSlot[] = [],
    entityId: number | bigint | string = 0
): ImmutableEntry[] {
    const schema = getWrappedSchema(itemId)
    if (!schema) throw new Error(`Item ${itemId} has no wrapped-asset schema`)
    const isEntity = getItem(itemId).type === 'entity'
    const slots = isEntity ? modules : []

    const values = new Map<string, unknown>([
        ['quantity', quantity],
        ['stats', String(stats)],
        ['origin_x', originX],
        ['origin_y', originY],
        [
            'img',
            computeNftImageUrl(
                {item_id: itemId, stats, modules: slots, quantity},
                originX,
                originY
            ),
        ],
        ['deposit_amount', '0'],
        ['deposit_token', '0'],
        ['deposit_symbol', '0'],
    ])
    if (isEntity) {
        const moduleItems = slots.map((m) => (m.installed ? Number(m.installed.item_id) : 0))
        const moduleStats = slots.map((m) => (m.installed ? BigInt(m.installed.stats) : 0n))
        values.set('entity_id', String(entityId))
        values.set('module_items', moduleItems)
        values.set(
            'module_stats',
            moduleStats.map((s) => String(s))
        )
        values.set('loadout', buildEntityLoadout(moduleItems, moduleStats))
    }

    const entries: ImmutableEntry[] = []
    for (const field of schema.fields) {
        if (!values.has(field.name)) continue
        const type = ATTRIBUTE_TYPE_BY_FIELD_TYPE[field.type]
        if (!type) throw new Error(`Unsupported schema field type ${field.type}`)
        entries.push({first: field.name, second: [type, values.get(field.name)]})
    }
    return entries
}
