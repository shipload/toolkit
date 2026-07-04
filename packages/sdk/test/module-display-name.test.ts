import {describe, expect, test} from 'bun:test'
import {getModules} from '../src/data/catalog'
import {moduleDisplayName} from '../src/nft/description'

describe('module display names', () => {
    test('every catalog module has a real display name in the NFT mirror', () => {
        for (const item of getModules()) {
            expect(moduleDisplayName(item.id)).not.toBe('Module')
        }
    })

    test('NFT mirror names match catalog names exactly', () => {
        for (const item of getModules()) {
            expect(moduleDisplayName(item.id)).toBe(item.name)
        }
    })
})
