import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {Checksum256} from '@wharfkit/antelope'
import {deriveStrata, wormholeAt} from '../../src'
import {deriveLocation, getLocationKind, getLocationType, hasSystem} from '../../src/utils/system'
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
        expected: {
            is_wormhole: boolean
            destination: {x: number; y: number}
            is_system: boolean
            type: number
            size: number
        }
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

        test(`location kind: ${c.name}`, () => {
            const at = {x: c.x, y: c.y}
            const loc = deriveLocation(seed, at)
            assert.equal(hasSystem(seed, at), c.expected.is_system)
            assert.equal(getLocationType(seed, at), c.expected.type)
            assert.equal(Number(loc.static_props.type), c.expected.type)
            assert.equal(Number(loc.size), c.expected.size)
            if (c.expected.is_wormhole) {
                assert.equal(getLocationKind(seed, c.x, c.y), 'wormhole')
                assert.deepEqual(deriveStrata(at, seed, seed), [])
            }
        })
    }

    test('the fixture covers both ends of a pair that also rolled a system', () => {
        const rolled = payload.cases.filter((c) => c.name.startsWith('system-rolled'))
        assert.lengthOf(rolled, 2)
        assert.deepEqual(
            {x: rolled[0].expected.destination.x, y: rolled[0].expected.destination.y},
            {x: rolled[1].x, y: rolled[1].y}
        )
    })
})
