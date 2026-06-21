import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {Checksum256} from '@wharfkit/antelope'
import {wormholeAt} from '../../src'
import {computeCatalogHash, CATALOG_FILES_REL} from '../../src/testing'

const FIXTURE_PATH = resolve(__dirname, '../fixtures/wormhole-cases.json')
const SDK_CATALOG_DIR = resolve(__dirname, '../../src/data')

interface WormholePayload {
    catalog_hash: string
    game_seed: string
    cases: Array<{
        name: string
        x: number
        y: number
        expected: {is_wormhole: boolean; destination: {x: number; y: number}}
    }>
}

describe('wormhole parity — fixture replay', () => {
    let payload: WormholePayload
    try {
        payload = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as WormholePayload
    } catch (e) {
        test('fixture present (regenerate with `make -C contracts build/projection-fixtures`)', () => {
            throw new Error(`Cannot read ${FIXTURE_PATH}: ${(e as Error).message}`)
        })
        return
    }

    const currentHash = computeCatalogHash(
        CATALOG_FILES_REL.map((f) => resolve(SDK_CATALOG_DIR, f))
    )
    if (currentHash !== payload.catalog_hash) {
        test('catalog hash matches fixture (regenerate fixtures)', () => {
            throw new Error(
                `Wormhole fixture catalog hash mismatch: fixture ${payload.catalog_hash} vs current ${currentHash}`
            )
        })
        return
    }

    const seed = Checksum256.from(payload.game_seed)

    for (const c of payload.cases) {
        test(`wormhole: ${c.name}`, () => {
            const sdk = wormholeAt(seed, c.x, c.y)
            if (c.expected.is_wormhole) {
                assert.deepEqual(sdk, {x: c.expected.destination.x, y: c.expected.destination.y})
            } else {
                assert.isNull(sdk)
            }
        })
    }
})
