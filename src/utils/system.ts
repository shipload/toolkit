import {Checksum256, Checksum256Type} from '@wharfkit/antelope'
import {hash512} from './hash'
import {CoordinatesType} from '../types'
import syllables from '../data/syllables.json'

export function getSystemName(gameSeed: Checksum256Type, location: CoordinatesType): string {
    const seed = Checksum256.from(gameSeed)
    if (!hasSystem(seed, location)) {
        throw new Error("System doesn't exist at location")
    }
    const seedStr = `${location.x}${location.y}systemName`
    const hashResult = hash512(seed, seedStr)
    const syllableCount = 1 + (hashResult.array[0] % 3)
    const name: string[] = []
    for (let i = 0; i < syllableCount; i++) {
        const index = hashResult.array[i] % syllables.length
        const syllable = syllables[index]
        name.push(i > 0 ? syllable.toLowerCase() : syllable)
    }
    return name.join('')
}

export function hasSystem(gameSeed: Checksum256Type, coordinates: CoordinatesType): boolean {
    const seed = Checksum256.from(gameSeed)
    const str = ['system', coordinates.x, coordinates.y].join('-')
    return String(hash512(seed, str)).slice(0, 2) === '00'
}
