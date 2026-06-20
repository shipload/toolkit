import type {Checksum256Type} from '@wharfkit/antelope'
import {SECTOR_FEISTEL, SECTORS_PER_AXIS} from './constants'
import {permute, unpermute} from './permutation'

// FROZEN INTERFACE — curation seed; review before launch, then never reorder.
export const SECTOR_ADJECTIVES: readonly string[] = [
    'Amber',
    'Azure',
    'Brass',
    'Cinder',
    'Cobalt',
    'Copper',
    'Coral',
    'Crimson',
    'Crystal',
    'Dusk',
    'Ember',
    'Emerald',
    'Frost',
    'Glimmer',
    'Golden',
    'Hazy',
    'Indigo',
    'Iron',
    'Ivory',
    'Jade',
    'Lunar',
    'Misty',
    'Neon',
    'Onyx',
    'Opal',
    'Pearl',
    'Plasma',
    'Quartz',
    'Rusty',
    'Saffron',
    'Scarlet',
    'Silver',
    'Solar',
    'Static',
    'Stormy',
    'Sunny',
    'Teal',
    'Umber',
    'Velvet',
    'Verdant',
    'Vermilion',
    'Violet',
    'Wispy',
]

export const SECTOR_NOUNS: readonly string[] = [
    'Belt',
    'Bluff',
    'Cluster',
    'Coil',
    'Crest',
    'Drift',
    'Expanse',
    'Fathom',
    'Flare',
    'Gulf',
    'Halo',
    'Haven',
    'Hollow',
    'Maw',
    'Mesa',
    'Mire',
    'Notch',
    'Nook',
    'Oasis',
    'Lagoon',
    'Peak',
    'Pocket',
    'Reach',
    'Reef',
    'Ridge',
    'Rift',
    'Run',
    'Shoal',
    'Shroud',
    'Span',
    'Spire',
    'Spur',
    'Stretch',
    'Sprawl',
    'Tangle',
    'Trace',
    'Trench',
    'Vale',
    'Vault',
    'Verge',
    'Vortex',
    'Ward',
    'Wisp',
]

export function encodeSector(seed: Checksum256Type, sx: number, sy: number): string {
    const index = sx * SECTORS_PER_AXIS + sy
    const scrambled = permute(seed, index, SECTOR_FEISTEL)
    const adj = Math.floor(scrambled / SECTORS_PER_AXIS)
    const noun = scrambled % SECTORS_PER_AXIS
    return `${SECTOR_ADJECTIVES[adj]} ${SECTOR_NOUNS[noun]}`
}

export function decodeSector(seed: Checksum256Type, name: string): {sx: number; sy: number} {
    const parts = name.trim().split(/\s+/)
    if (parts.length !== 2) throw new Error(`invalid sector name: ${name}`)
    const adj = SECTOR_ADJECTIVES.indexOf(parts[0])
    const noun = SECTOR_NOUNS.indexOf(parts[1])
    if (adj < 0 || noun < 0) throw new Error(`unknown sector name: ${name}`)
    const scrambled = adj * SECTORS_PER_AXIS + noun
    const index = unpermute(seed, scrambled, SECTOR_FEISTEL)
    return {sx: Math.floor(index / SECTORS_PER_AXIS), sy: index % SECTORS_PER_AXIS}
}
