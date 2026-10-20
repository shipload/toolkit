import {describe, expect, test} from 'bun:test'
import {SandboxContract} from '@shipload/sdk'
import {
    type ActsContext,
    buildCredit,
    buildGrant,
    buildResolve,
    buildSpawn,
    parseEnergy,
    parseModule,
    parseStats,
    resolveStats,
    sandboxContract,
} from '../../../src/commands/sandbox/acts'
import {assertSandbox} from '../../../src/commands/sandbox/guard'
import {client} from '../../../src/lib/client'
import {ValidationError} from '../../../src/lib/validate'

const SHIP = 10201
const ENGINE = 10100

const ctx: ActsContext = {contract: sandboxContract(client, 'box.shipload'), owner: 'player.gm'}

function decode<T>(action: ReturnType<typeof buildSpawn>, type: {from(v: unknown): T}): T {
    return action.decodeData(type as never) as T
}

describe('sandbox arg parsers', () => {
    test('parses a stat list', () => {
        expect(parseStats('0,500,999')).toEqual([0, 500, 999])
    })

    test('rejects stats above 999 or blank entries', () => {
        expect(() => parseStats('1000')).toThrow('0–999')
        expect(() => parseStats('1,,2')).toThrow('0–999')
    })

    test('parses a module with and without stats', () => {
        expect(parseModule('0:10100')).toEqual({slot: 0, itemId: ENGINE})
        expect(parseModule('1:10100:800,700')).toEqual({slot: 1, itemId: ENGINE, stats: [800, 700]})
    })

    test('parses whole energy and rejects fractions', () => {
        expect(parseEnergy('250')).toBe(250)
        expect(() => parseEnergy('2.5')).toThrow('whole number')
    })

    test('rejects a malformed module', () => {
        expect(() => parseModule('10100')).toThrow('<slot>:<item-id>')
    })
})

describe('resolveStats', () => {
    test('defaults every stat to 500', () => {
        expect(resolveStats(SHIP)).toEqual([500, 500, 500])
    })

    test('refuses the wrong stat count with a suggestion', () => {
        try {
            resolveStats(SHIP, [1, 2])
            throw new Error('expected a refusal')
        } catch (err) {
            expect(err).toBeInstanceOf(ValidationError)
            expect((err as ValidationError).message).toContain('takes 3 stats, got 2')
            expect((err as ValidationError).suggestion).toBe('--stats 500,500,500')
        }
    })
})

describe('sandbox act builders', () => {
    test('sbspawn carries owner, defaulted stats, module stats and energy', () => {
        const action = buildSpawn(ctx, {
            itemId: SHIP,
            x: -3n,
            y: 4n,
            modules: [{slot: 0, itemId: ENGINE}],
            energy: 100,
        })
        expect(String(action.account)).toBe('box.shipload')
        expect(String(action.name)).toBe('sbspawn')
        const data = decode(action, SandboxContract.Types.sbspawn)
        expect(String(data.owner)).toBe('player.gm')
        expect(data.stats.map(Number)).toEqual([500, 500, 500])
        expect(
            data.modules.map((m) => [Number(m.slot), Number(m.item_id), m.stats.map(Number)])
        ).toEqual([[0, ENGINE, [500, 500]]])
        expect(Number(data.x)).toBe(-3)
        expect(Number(data.energy)).toBe(100_000)
    })

    test('sbspawn leaves energy unset when omitted', () => {
        const data = decode(
            buildSpawn(ctx, {itemId: SHIP, x: 0n, y: 0n}),
            SandboxContract.Types.sbspawn
        )
        expect(data.energy).toBeUndefined()
    })

    test('sbgrant sends one item with its quantity', () => {
        const data = decode(
            buildGrant(ctx, {entityId: 42n, itemId: 10001, quantity: 7}),
            SandboxContract.Types.sbgrant
        )
        expect(Number(data.entity_id)).toBe(42)
        expect(data.items).toHaveLength(1)
        expect(Number(data.items[0].quantity)).toBe(7)
    })

    test('sbcredit and sbresolve carry their optional fields', () => {
        const credit = decode(buildCredit(ctx, 1n, 2n, 5000n, 3), SandboxContract.Types.sbcredit)
        expect(Number(credit.node)).toBe(3)
        const resolve = decode(buildResolve(ctx, 9n), SandboxContract.Types.sbresolve)
        expect(resolve.count).toBeUndefined()
    })
})

describe('assertSandbox', () => {
    test('passes when the server ABI has sbspawn', async () => {
        await expect(
            assertSandbox('box.shipload', async () => ['sbspawn', 'travel'], 'sandbox.ini')
        ).resolves.toBeUndefined()
    })

    test('refuses a live server before anything is sent', async () => {
        await expect(
            assertSandbox('eon.shipload', async () => ['travel', 'dbgwipe'], 'config.ini')
        ).rejects.toThrow('eon.shipload is not a Sandbox server')
    })
})
