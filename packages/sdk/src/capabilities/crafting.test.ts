import {expect, test} from 'bun:test'
import {calc_craft_energy} from './crafting'

test('calc_craft_energy does not clamp above the old uint16 ceiling', () => {
    const energy = calc_craft_energy(30, 400_000_000)
    expect(Number(energy)).toBeGreaterThan(65535)
})
