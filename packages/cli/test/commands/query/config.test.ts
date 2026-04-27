import {expect, test} from 'bun:test'
import {render} from '../../../src/commands/query/config'

test('config renders as formatted lines by default', () => {
    const out = render({game_seed: 'deadbeef', epoch_time: 446400} as any, false)
    expect(out).toContain('deadbeef')
    expect(out).toContain('446400')
})

test('config emits JSON when raw=true', () => {
    const out = render({game_seed: 'deadbeef'} as any, true)
    expect(JSON.parse(out)).toEqual({game_seed: 'deadbeef'})
})
