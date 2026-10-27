import {expect, test} from 'bun:test'
import {getRecipeConsumers, getComponentDemand} from '@shipload/sdk'
import {renderWhereUsed, renderDemand, renderResourceDemand} from './recipe'

const ITEM_SENSOR = 10006
const ITEM_SENSOR_T2 = 11006
const ITEM_RESIN = 10010
const ITEM_RESONATOR = 10004

test('renderWhereUsed shows the hull slot fed by Sensor', () => {
    const out = renderWhereUsed(ITEM_SENSOR, getRecipeConsumers(ITEM_SENSOR))
    expect(out).toContain('Sensor')
    expect(out).toContain('Prospector')
    expect(out).toContain('0 sink-only')
    expect(out).toContain('dormant')
})

test('renderWhereUsed marks a mass-only consumer as a sink', () => {
    const out = renderWhereUsed(ITEM_SENSOR_T2, getRecipeConsumers(ITEM_SENSOR_T2))
    expect(out).toContain('Sensor')
    expect(out).toContain('1 sink-only')
    expect(out).toMatch(/Mining Rig.*sink|sink.*Mining Rig/s)
})

test('renderWhereUsed shows the hauling efficiency flow fed by Resonator', () => {
    const out = renderWhereUsed(ITEM_RESONATOR, getRecipeConsumers(ITEM_RESONATOR))
    expect(out).toContain('Resonator')
    expect(out).toContain('Tractor Beam')
    expect(out).toContain('Hauling.efficiency')
})

test('renderWhereUsed shows the drain flow fed by Resin', () => {
    const out = renderWhereUsed(ITEM_RESIN, getRecipeConsumers(ITEM_RESIN))
    expect(out).toContain('Resin')
    expect(out).toContain('Hauling.drain')
})

test('renderDemand surfaces Resin as the least-used component', () => {
    const out = renderDemand(getComponentDemand())
    expect(out).toContain('Resin')
    const resinLine = out.split('\n').find((l) => l.includes('Resin'))
    expect(resinLine).toContain('1')
})

test('renderResourceDemand shows tonnage and percentage per resource', () => {
    const out = renderResourceDemand('Test', {ore: 30, gas: 10})
    const oreLine = out.split('\n').find((l) => l.includes('Ore'))
    expect(oreLine).toContain('30')
    expect(oreLine).toContain('75')
    const gasLine = out.split('\n').find((l) => l.includes('Gas'))
    expect(gasLine).toContain('25')
})
