import {Serializer} from '@wharfkit/antelope'
import {getItem} from '../data/catalog'
import {
    getModuleCapabilityType,
    MODULE_BATTERY,
    MODULE_BUILDER,
    MODULE_CRAFTER,
    MODULE_ENGINE,
    MODULE_GATHERER,
    MODULE_GENERATOR,
    MODULE_HAULER,
    MODULE_LOADER,
    MODULE_STORAGE,
    MODULE_WARP,
} from '../capabilities/modules'
import {decodeStat, decodeCraftedItemStats} from '../derivation/crafting'
import {computeEffectiveModuleStat} from '../derivation/stat-scaling'
import {getStatDefinitions} from '../derivation/stats'
import type {ResourceCategory} from '../types'
import {Types as ServerTypes} from '../contracts/server'
import {
    buildEntityDescription,
    computeBuilderDrain,
    computeBuilderSpeed,
    computeCrafterDrain,
    computeCrafterSpeed,
    computeEngineDrain,
    computeEngineThrust,
    computeGathererDepth,
    computeGathererDrain,
    computeGathererYield,
    computeGeneratorCap,
    computeGeneratorRech,
    computeCargoBayCapacity,
    computeCargoBayDrain,
    computeBatteryBankCapacity,
    computeHaulerCapacity,
    computeHaulerDrain,
    computeHaulerEfficiency,
    computeLoaderMass,
    computeLoaderThrust,
    computeWarpRange,
} from './description'

export type AtomicAttributeType =
    | 'string'
    | 'uint8'
    | 'uint16'
    | 'uint32'
    | 'uint64'
    | 'int32'
    | 'image'
    | 'ipfs'
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

function toWholeEnergy(milli: number): number {
    return Math.floor((milli + 500) / 1000)
}

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

function commonBaseImmutable(
    quantity: number,
    stats: bigint,
    originX: number,
    originY: number,
    img: string
): ImmutableEntry[] {
    return [
        {first: 'quantity', second: ['uint32', quantity]},
        {first: 'stats', second: ['uint64', String(stats)]},
        {first: 'origin_x', second: ['int32', originX]},
        {first: 'origin_y', second: ['int32', originY]},
        {first: 'img', second: ['string', img]},
        {first: 'deposit_amount', second: ['uint64', '0']},
        {first: 'deposit_token', second: ['uint64', '0']},
        {first: 'deposit_symbol', second: ['uint64', '0']},
    ]
}

export function buildResourceImmutable(
    itemId: number,
    quantity: number,
    stats: bigint,
    originX: number,
    originY: number
): ImmutableEntry[] {
    const item = getItem(itemId)
    const cat = item.category
    if (!cat) throw new Error(`Resource item ${itemId} has no category`)
    const definitions = getStatDefinitions(cat as ResourceCategory)
    const img = computeNftImageUrl(
        {item_id: itemId, stats, modules: [], quantity},
        originX,
        originY
    )
    const base = commonBaseImmutable(quantity, stats, originX, originY, img)
    base.push({first: definitions[0].key, second: ['uint16', decodeStat(stats, 0)]})
    base.push({first: definitions[1].key, second: ['uint16', decodeStat(stats, 1)]})
    base.push({first: definitions[2].key, second: ['uint16', decodeStat(stats, 2)]})
    return base
}

export function buildComponentImmutable(
    itemId: number,
    quantity: number,
    stats: bigint,
    originX: number,
    originY: number
): ImmutableEntry[] {
    const img = computeNftImageUrl(
        {item_id: itemId, stats, modules: [], quantity},
        originX,
        originY
    )
    const base = commonBaseImmutable(quantity, stats, originX, originY, img)
    const decoded = decodeCraftedItemStats(itemId, stats)
    for (const [key, value] of Object.entries(decoded)) {
        base.push({first: key, second: ['uint16', value]})
    }
    return base
}

export function buildModuleImmutable(
    itemId: number,
    quantity: number,
    stats: bigint,
    originX: number,
    originY: number
): ImmutableEntry[] {
    const img = computeNftImageUrl(
        {item_id: itemId, stats, modules: [], quantity},
        originX,
        originY
    )
    const base = commonBaseImmutable(quantity, stats, originX, originY, img)
    const subtype = getModuleCapabilityType(itemId)
    const item = getItem(itemId)
    switch (subtype) {
        case MODULE_ENGINE: {
            const vol = decodeStat(stats, 0)
            const thm = decodeStat(stats, 1)
            base.push({first: 'volatility', second: ['uint16', vol]})
            base.push({first: 'thermal', second: ['uint16', thm]})
            base.push({
                first: 'thrust',
                second: ['uint32', computeEngineThrust(computeEffectiveModuleStat(vol))],
            })
            base.push({
                first: 'drain',
                second: ['uint16', computeEngineDrain(computeEffectiveModuleStat(thm))],
            })
            break
        }
        case MODULE_GENERATOR: {
            const res = decodeStat(stats, 0)
            const ref = decodeStat(stats, 1)
            base.push({first: 'resonance', second: ['uint16', res]})
            base.push({first: 'reflectivity', second: ['uint16', ref]})
            base.push({
                first: 'capacity',
                second: [
                    'uint16',
                    toWholeEnergy(computeGeneratorCap(computeEffectiveModuleStat(res))),
                ],
            })
            base.push({
                first: 'recharge',
                second: [
                    'uint16',
                    toWholeEnergy(computeGeneratorRech(computeEffectiveModuleStat(ref))),
                ],
            })
            break
        }
        case MODULE_GATHERER: {
            const str = decodeStat(stats, 0)
            const hrd = decodeStat(stats, 1)
            const sat = decodeStat(stats, 2)
            base.push({first: 'strength', second: ['uint16', str]})
            base.push({first: 'hardness', second: ['uint16', hrd]})
            base.push({first: 'saturation', second: ['uint16', sat]})
            base.push({first: 'yield', second: ['uint16', computeGathererYield(str)]})
            base.push({
                first: 'drain',
                second: ['uint16', toWholeEnergy(computeGathererDrain(sat))],
            })
            base.push({first: 'depth', second: ['uint16', computeGathererDepth(hrd, item.tier)]})
            break
        }
        case MODULE_LOADER: {
            const fin = decodeStat(stats, 0)
            const pla = decodeStat(stats, 1)
            base.push({first: 'fineness', second: ['uint16', fin]})
            base.push({first: 'plasticity', second: ['uint16', pla]})
            base.push({first: 'mass', second: ['uint32', computeLoaderMass(fin)]})
            base.push({first: 'thrust', second: ['uint16', computeLoaderThrust(pla)]})
            break
        }
        case MODULE_WARP: {
            const ref = decodeStat(stats, 0)
            base.push({first: 'reflectivity', second: ['uint16', ref]})
            base.push({first: 'range', second: ['uint32', computeWarpRange(ref)]})
            break
        }
        case MODULE_CRAFTER: {
            const fin = decodeStat(stats, 0)
            const con = decodeStat(stats, 1)
            base.push({first: 'fineness', second: ['uint16', fin]})
            base.push({first: 'conductivity', second: ['uint16', con]})
            base.push({first: 'speed', second: ['uint16', computeCrafterSpeed(fin)]})
            base.push({first: 'drain', second: ['uint16', toWholeEnergy(computeCrafterDrain(con))]})
            break
        }
        case MODULE_BUILDER: {
            const coh = decodeStat(stats, 0)
            const tol = decodeStat(stats, 1)
            base.push({first: 'cohesion', second: ['uint16', coh]})
            base.push({first: 'tolerance', second: ['uint16', tol]})
            base.push({first: 'speed', second: ['uint16', computeBuilderSpeed(coh)]})
            base.push({first: 'drain', second: ['uint16', toWholeEnergy(computeBuilderDrain(tol))]})
            break
        }
        case MODULE_STORAGE: {
            const str = decodeStat(stats, 0)
            const den = decodeStat(stats, 1)
            const hrd = decodeStat(stats, 2)
            const com = decodeStat(stats, 3)
            base.push({first: 'strength', second: ['uint16', str]})
            base.push({first: 'density', second: ['uint16', den]})
            base.push({first: 'hardness', second: ['uint16', hrd]})
            base.push({first: 'cohesion', second: ['uint16', com]})
            base.push({
                first: 'capacity',
                second: ['uint32', computeCargoBayCapacity(str, den, hrd)],
            })
            base.push({
                first: 'drain',
                second: ['uint16', toWholeEnergy(computeCargoBayDrain(com, item.tier))],
            })
            break
        }
        case MODULE_BATTERY: {
            const vol = decodeStat(stats, 0)
            const thm = decodeStat(stats, 1)
            const pla = decodeStat(stats, 2)
            const ins = decodeStat(stats, 3)
            base.push({first: 'volatility', second: ['uint16', vol]})
            base.push({first: 'thermal', second: ['uint16', thm]})
            base.push({first: 'plasticity', second: ['uint16', pla]})
            base.push({first: 'insulation', second: ['uint16', ins]})
            base.push({
                first: 'capacity',
                second: ['uint32', toWholeEnergy(computeBatteryBankCapacity(vol, thm, pla, ins))],
            })
            break
        }
        case MODULE_HAULER: {
            const res = decodeStat(stats, 0)
            const pla = decodeStat(stats, 1)
            const con = decodeStat(stats, 2)
            base.push({first: 'resonance', second: ['uint16', res]})
            base.push({first: 'plasticity', second: ['uint16', pla]})
            base.push({first: 'conductivity', second: ['uint16', con]})
            base.push({first: 'capacity', second: ['uint8', computeHaulerCapacity(res, item.tier)]})
            base.push({first: 'efficiency', second: ['uint16', computeHaulerEfficiency(pla)]})
            base.push({
                first: 'drain',
                second: ['uint16', toWholeEnergy(computeHaulerDrain(con, item.tier))],
            })
            break
        }
    }
    return base
}

export function buildEntityImmutable(
    itemId: number,
    quantity: number,
    stats: bigint,
    originX: number,
    originY: number,
    modules: ImmutableModuleSlot[]
): ImmutableEntry[] {
    const moduleItems: number[] = []
    const moduleStats: string[] = []
    for (const m of modules) {
        if (m.installed) {
            moduleItems.push(Number(m.installed.item_id))
            moduleStats.push(String(m.installed.stats))
        } else {
            moduleItems.push(0)
            moduleStats.push('0')
        }
    }
    const img = computeNftImageUrl({item_id: itemId, stats, modules, quantity}, originX, originY)
    const base = commonBaseImmutable(quantity, stats, originX, originY, img)
    base.push({first: 'module_items', second: ['UINT16_VEC', moduleItems]})
    base.push({first: 'module_stats', second: ['UINT64_VEC', moduleStats]})
    const description = buildEntityDescription(
        itemId,
        stats,
        moduleItems,
        moduleStats.map((s) => BigInt(s))
    )
    base.push({first: 'description', second: ['string', description]})
    return base
}

export function buildImmutableData(
    itemId: number,
    quantity: number,
    stats: bigint,
    originX: number,
    originY: number,
    modules: ImmutableModuleSlot[] = []
): ImmutableEntry[] {
    const item = getItem(itemId)
    if (item.type === 'resource') {
        return buildResourceImmutable(itemId, quantity, stats, originX, originY)
    }
    if (item.type === 'component') {
        return buildComponentImmutable(itemId, quantity, stats, originX, originY)
    }
    if (item.type === 'module') {
        return buildModuleImmutable(itemId, quantity, stats, originX, originY)
    }
    if (item.type === 'entity') {
        return buildEntityImmutable(itemId, quantity, stats, originX, originY, modules)
    }
    throw new Error(`Unsupported item type for wrap: ${item.type}`)
}
