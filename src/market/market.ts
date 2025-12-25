import {CoordinatesType, GoodPrice} from '../types'
import {getGood, getGoods} from './goods'
import {Checksum256Type, UInt16, UInt16Type, UInt32} from '@wharfkit/antelope'
import {roll} from './rolls'
import {ServerContract} from '../contracts'

export enum Rarities {
    legendary = 'LEGENDARY',
    epic = 'EPIC',
    rare = 'RARE',
    uncommon = 'UNCOMMON',
    common = 'COMMON',
    trash = 'TRASH',
}

export interface Rarity {
    rarity: Rarities // The rarity description of this price
    minMultiplier: number // The minimum multiplier for this rarity
    maxMultiplier: number // The maximum multiplier for this rarity
}

export function getRarity(
    gameSeed: Checksum256Type,
    epochSeed: Checksum256Type,
    location: CoordinatesType,
    goodId: UInt16Type
): Rarity {
    const seed = `${epochSeed}${location.x}${location.y}${goodId}rarity`
    const rarityRoll = roll(gameSeed, seed)

    if (rarityRoll < 13) {
        // (Orange) ~0.02% chance = incredibly high value
        return {
            rarity: Rarities.legendary,
            minMultiplier: 2.25,
            maxMultiplier: 3.0,
        }
    } else if (rarityRoll < 176) {
        // (Purple) ~0.25% chance = super high value
        return {
            rarity: Rarities.epic,
            minMultiplier: 1.75,
            maxMultiplier: 2.25,
        }
    } else if (rarityRoll < 996) {
        // (Blue) ~1.25% chance = very high value
        return {
            rarity: Rarities.rare,
            minMultiplier: 1.4,
            maxMultiplier: 1.75,
        }
    } else if (rarityRoll < 2966) {
        // (Green) ~3.00% chance = high value
        return {
            rarity: Rarities.uncommon,
            minMultiplier: 1.225,
            maxMultiplier: 1.4,
        }
    } else if (rarityRoll < 19568) {
        // (White) ~25.33% chance = slightly higher value
        return {
            rarity: Rarities.common,
            minMultiplier: 1.07,
            maxMultiplier: 1.225,
        }
    } else if (rarityRoll < 45988) {
        // ~40.30% chance = no value change
        return {
            rarity: Rarities.trash,
            minMultiplier: 1,
            maxMultiplier: 1.07,
        } // Product is not available
    } else if (rarityRoll < 62508) {
        // (White) ~25.33% chance = slightly lower value
        return {
            rarity: Rarities.common,
            minMultiplier: 0.925,
            maxMultiplier: 1,
        }
    } else if (rarityRoll < 64518) {
        // (Green) ~3.00% chance = low value
        return {
            rarity: Rarities.uncommon,
            minMultiplier: 0.77,
            maxMultiplier: 0.925,
        }
    } else if (rarityRoll < 65437) {
        // (Blue) ~1.25% chance = very low value
        return {
            rarity: Rarities.rare,
            minMultiplier: 0.595,
            maxMultiplier: 0.77,
        }
    } else if (rarityRoll < 65523) {
        // (Purple) ~0.25% chance = super low value
        return {
            rarity: Rarities.epic,
            minMultiplier: 0.41,
            maxMultiplier: 0.595,
        }
    } else {
        // (Orange) ~0.02% chance = incredibly low value
        return {
            rarity: Rarities.legendary,
            minMultiplier: 0.285,
            maxMultiplier: 0.41,
        }
    }
}

export function getRarityMultiplier(
    gameSeed: Checksum256Type,
    epochSeed: Checksum256Type,
    location: CoordinatesType,
    goodId: UInt16Type
): number {
    const rarity = getRarity(gameSeed, epochSeed, location, goodId)
    const range = rarity.maxMultiplier - rarity.minMultiplier
    const seed = `${epochSeed}${location.x}${location.y}${goodId}raritymultiplier`
    const r = roll(gameSeed, seed)
    return rarity.minMultiplier + (r / 65535) * range
}

export function getLocationMultiplier(
    gameSeed: Checksum256Type,
    location: CoordinatesType,
    goodId: UInt16Type
): number {
    const seed = `${location.x}${location.y}${goodId}locationmultiplier`
    const r = roll(gameSeed, seed)
    if (r < 13) {
        return 0.75
    } else if (r < 176) {
        return 0.8
    } else if (r < 996) {
        return 0.85
    } else if (r < 2966) {
        return 0.9
    } else if (r < 19568) {
        return 0.95
    } else if (r < 45988) {
        return 1
    } else if (r < 62508) {
        return 1.05
    } else if (r < 64518) {
        return 1.1
    } else if (r < 65437) {
        return 1.15
    } else if (r < 65523) {
        return 1.2
    } else {
        return 1.25
    }
}

export function getSupply(
    gameSeed: Checksum256Type,
    state: ServerContract.Types.state_row,
    location: CoordinatesType,
    goodId: UInt16Type
): number {
    const seed = `${state.seed}${location.x}${location.y}${goodId}supply`
    const r = roll(gameSeed, seed)
    const percent = r / 65535
    const epoch = 1 + Number(state.epoch) / 90
    // NOTE: Contract has bug where 1/3 is integer division = 0, so pow(ships, 0) = 1
    // TODO: Update this when contract is fixed to use (double)1/(double)3
    const ship = Math.pow(Number(state.ships), 0)
    const goodIdNum = Number(goodId)
    return Math.floor((128 / goodIdNum) * percent * ship * epoch)
}

export function marketPrice(
    location: ServerContract.ActionParams.Type.coordinates,
    goodId: UInt16Type,
    gameSeed: Checksum256Type,
    state: ServerContract.Types.state_row
): GoodPrice {
    const good = getGood(goodId)
    let price = Number(good.base_price)

    // Rarity multiplier of the deal (changes with epoch)
    // Large impact range on price, from 0.285x to 3.0x
    const rarityMultiplier = getRarityMultiplier(gameSeed, state.seed, location, goodId)
    price *= rarityMultiplier

    // Location multiplier of the deal (static, based on game seed)
    // Small impact range on price, from 1.0x to 1.5x
    const locationMultiplier = getLocationMultiplier(gameSeed, location, goodId)
    price *= locationMultiplier

    // Determine the current supply of the good at the location
    const supply = getSupply(gameSeed, state, location, goodId)

    return GoodPrice.from({
        id: goodId,
        good,
        price: UInt32.from(price),
        supply: UInt16.from(supply),
    })
}

export function marketPrices(
    location: ServerContract.ActionParams.Type.coordinates,
    gameSeed: Checksum256Type,
    state: ServerContract.Types.state_row
): GoodPrice[] {
    return getGoods().map((good) => marketPrice(location, good.id, gameSeed, state))
}
