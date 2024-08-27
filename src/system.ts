import {Checksum256} from '@wharfkit/antelope'
import {hash512} from './hash'
import {Coordinates} from './types'
import {ServerContract} from './contracts'
import syllables from './syllables'

export function getSystemName(gameSeed: Checksum256, location: Coordinates): string {
    if (!hasSystem(gameSeed, location)) {
        throw new Error("System doesn't exist at location")
    }
    // Create a seed string using the location coordinates
    const seed = `${location.x}${location.y}systemName`

    // Hash the seed to get a consistent hash value
    const hash = hash512(gameSeed, seed)

    // Determine the number of syllables for the name (1 to 3)
    const syllableCount = 1 + (hash.array[0] % 3)

    // Use the hash to select syllables
    const name: string[] = []
    for (let i = 0; i < syllableCount; i++) {
        const index = hash.array[i] % syllables.length
        const syllable = syllables[index]
        name.push(i > 0 ? syllable.toLowerCase() : syllable)
    }

    return name.join('')
}

export function hasSystem(
    gameSeed: Checksum256,
    coordinates: ServerContract.ActionParams.Type.coordinates
): boolean {
    const str = ['system', coordinates.x, coordinates.y].join('-')
    return String(hash512(gameSeed, str)).slice(0, 2) === '00'
}
