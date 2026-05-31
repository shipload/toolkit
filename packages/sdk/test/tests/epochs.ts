import {describe, test} from 'bun:test'
import {assert} from 'chai'
import {UInt64} from '@wharfkit/antelope'
import {EpochsManager} from '$lib'

describe('EpochsManager.getFinalizedEpoch reload', () => {
    test('forwards reload flag to context.getState', async () => {
        const seen: boolean[] = []
        const context = {
            getState: async (reload = false) => {
                seen.push(reload)
                return {currentEpoch: UInt64.from(7)}
            },
        } as unknown as ConstructorParameters<typeof EpochsManager>[0]
        const epochs = new EpochsManager(context)
        await epochs.getFinalizedEpoch()
        await epochs.getFinalizedEpoch(true)
        assert.deepEqual(seen, [false, true])
    })
})
