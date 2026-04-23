import {expect, test} from 'bun:test'
import {describeItem} from '../../src/resolution/display-name'
import {resolveItem} from '../../src/resolution/resolve-item'

test('describeItem for resource includes tier, category, stats, mass', () => {
    const resolved = resolveItem(101, 12345)
    const desc = describeItem(resolved)
    expect(desc).toContain('T1 Ore')
    expect(desc).toMatch(/Strength \d+/)
    expect(desc).toMatch(/\d+(\.\d+)? t$/)
})

test('describeItem for module uses name', () => {
    const resolved = resolveItem(10100)
    const desc = describeItem(resolved)
    expect(desc).toContain('Engine')
})
