import {expect, test} from 'bun:test'
import {confirm} from '../../src/lib/prompt'

test('confirm returns true immediately when assumeYes is set', async () => {
    expect(await confirm('Proceed?', true)).toBe(true)
})
