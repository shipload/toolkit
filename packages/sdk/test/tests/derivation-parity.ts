import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {Checksum256} from '@wharfkit/antelope'
import {deriveStratum, deriveLocationStatic, getEligibleResources} from '../../src'
import {computeCatalogHash, CATALOG_FILES_REL} from '../../src/testing'

const FIXTURE_PATH = resolve(__dirname, '../fixtures/derivation-cases.json')
const SDK_CATALOG_DIR = resolve(__dirname, '../../src/data')
const GAME_SEED = Checksum256.from(
    '0be1140ada53742f96d665c114fa693bd1512f886b6949b08b570fd70b764e83'
)

interface DerivationPayload {
    catalog_hash: string
    epoch_seed: string
    stratum: Array<{
        name: string
        x: number
        y: number
        stratum: number
        expected: {item_id: number; reserve: number; richness: number; seed: string}
    }>
    eligible: Array<{
        name: string
        x: number
        y: number
        stratum: number
        locType: number
        subtype: number
        expected: number[]
    }>
}

describe('derivation parity — fixture replay', () => {
    let payload: DerivationPayload
    try {
        payload = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as DerivationPayload
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
                `Derivation fixture catalog hash mismatch.\n` +
                    `  fixture: ${payload.catalog_hash}\n` +
                    `  current: ${currentHash}\n` +
                    'Re-run `make -C toolkit/packages/sdk sync-catalog` then `make -C contracts build/projection-fixtures`.'
            )
        })
        return
    }

    const epochSeed = Checksum256.from(payload.epoch_seed)

    for (const c of payload.stratum) {
        test(`deriveStratum: ${c.name}`, () => {
            const loc = deriveLocationStatic(GAME_SEED, {x: c.x, y: c.y})
            const sdk = deriveStratum(
                epochSeed,
                {x: c.x, y: c.y},
                c.stratum,
                Number(loc.type),
                Number(loc.subtype),
                65535
            )
            assert.equal(sdk.reserve, c.expected.reserve)
            assert.equal(sdk.richness, c.expected.richness)
            assert.equal(sdk.seed.toString(), c.expected.seed)
            if (c.expected.reserve > 0) assert.equal(sdk.itemId, c.expected.item_id)
        })
    }

    for (const c of payload.eligible) {
        test(`getEligibleResources: ${c.name}`, () => {
            const got = getEligibleResources(c.locType, c.subtype, c.stratum).sort((a, b) => a - b)
            assert.deepEqual(got, c.expected)
        })
    }
})
