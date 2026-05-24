import {expect, test} from 'bun:test'
import {render} from '../../../src/commands/query/epoch'

test('epoch shows seed, started, and computed timing', () => {
    const now = new Date('2026-04-21T14:32:10Z')
    const started = new Date('2026-04-20T00:00:00Z')
    const out = render(
        {
            seed: 'abc123',
            epoch: 7,
            started,
            epochTimeSeconds: 446400,
            now,
            contracts: [
                {name: 'shipload.gm', lastCodeUpdate: new Date('2026-05-04T18:08:24Z')},
                {name: 'platform.gm', lastCodeUpdate: new Date('2026-04-26T21:50:20Z')},
            ],
        },
        false
    )
    expect(out).toContain('abc123')
    expect(out).toContain('7')
    expect(out).toContain('2026-04-20')
    expect(out).toMatch(/Remaining:/)
    expect(out).toMatch(/Elapsed:/)
})

test('epoch --raw emits JSON', () => {
    const out = render(
        {
            seed: 'abc',
            epoch: 1,
            started: new Date('2026-01-01T00:00:00Z'),
            epochTimeSeconds: 60,
            now: new Date('2026-01-01T00:00:30Z'),
            contracts: [],
        },
        true
    )
    const parsed = JSON.parse(out)
    expect(parsed.seed).toBe('abc')
    expect(parsed.elapsed_seconds).toBe(30)
    expect(parsed.remaining_seconds).toBe(30)
})

test('epoch warns when on-chain epoch differs from wall-clock epoch', () => {
    const out = render(
        {
            seed: 'abc',
            epoch: 2,
            calculatedEpoch: 4,
            started: new Date('2026-01-01T00:01:00Z'),
            epochTimeSeconds: 60,
            now: new Date('2026-01-01T00:03:30Z'),
            contracts: [],
        },
        false
    )
    expect(out).toContain('WARNING:')
    expect(out).toContain('on-chain epoch 2')
    expect(out).toContain('wall-clock epoch 4')
})

test('epoch --raw includes calculated epoch divergence state', () => {
    const out = render(
        {
            seed: 'abc',
            epoch: 2,
            calculatedEpoch: 4,
            started: new Date('2026-01-01T00:01:00Z'),
            epochTimeSeconds: 60,
            now: new Date('2026-01-01T00:03:30Z'),
            contracts: [],
        },
        true
    )
    const parsed = JSON.parse(out)
    expect(parsed.calculated_epoch).toBe(4)
    expect(parsed.epoch_diverged).toBe(true)
})
