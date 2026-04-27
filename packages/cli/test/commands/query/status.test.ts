import {expect, test} from 'bun:test'
import {render} from '../../../src/commands/query/status'

test('status renders game enabled state', () => {
    const out = render({
        enabled: true,
        platformAccount: 'platform.gm',
        serverAccount: 'shipload.gm',
    })
    expect(out).toContain('enabled')
    expect(out).toContain('platform.gm')
})

test('status marks disabled games', () => {
    const out = render({
        enabled: false,
        platformAccount: 'platform.gm',
        serverAccount: 'shipload.gm',
    })
    expect(out).toContain('disabled')
})
