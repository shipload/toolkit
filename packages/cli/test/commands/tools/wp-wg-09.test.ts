import {describe, expect, test} from 'bun:test'
import {join} from 'node:path'

const CLI = join(import.meta.dir, '../../../src/index.ts')
const GAME = '0be1140ada53742f96d665c114fa693bd1512f886b6949b08b570fd70b764e83'
const EPOCH = '0000000000000000000000000000000000000000000000000000000000000002'

async function scan(radius: number, workers: number) {
    const proc = Bun.spawn(
        [
            'bun',
            CLI,
            'tools',
            'scan',
            String(radius),
            '--workers',
            String(workers),
            '--game-seed',
            GAME,
            '--epoch-seed',
            EPOCH,
            '--top',
            '50',
            '--json',
        ],
        {stdout: 'pipe', stderr: 'ignore'}
    )
    const out = await new Response(proc.stdout).text()
    await proc.exited
    const json = JSON.parse(out)
    delete json.header.runtimeSeconds
    return json
}

describe('WP-WG-09 scanner determinism', () => {
    test('the same seeds and flags give identical output across runs', async () => {
        const a = await scan(40, 0)
        const b = await scan(40, 0)
        expect(b).toEqual(a)
    }, 120000)

    test('parallel workers produce the single-threaded result', async () => {
        const single = await scan(40, 0)
        for (const workers of [2, 3, 7]) {
            expect(await scan(40, workers)).toEqual(single)
        }
        expect(single.header.strata).toBeGreaterThan(0)
    }, 240000)
})
