import {expect, test} from 'bun:test'
import {getRecipeConsumers, getComponentDemand} from '@shipload/sdk'
import {renderWhereUsed, renderDemand, renderResourceDemand} from './recipe'

const ITEM_SENSOR = 10006
const ITEM_RESIN = 10010

test('renderWhereUsed shows the fabricator drain flow and marks the mining rig as a sink', () => {
    const out = renderWhereUsed(ITEM_SENSOR, getRecipeConsumers(ITEM_SENSOR))
    expect(out).toContain('Sensor')
    expect(out).toContain('Fabricator')
    expect(out).toContain('drain')
    expect(out).toMatch(/Mining Rig.*sink|sink.*Mining Rig/s)
})

test('renderWhereUsed shows the gatherer drain flow fed by Resin', () => {
    const out = renderWhereUsed(ITEM_RESIN, getRecipeConsumers(ITEM_RESIN))
    expect(out).toContain('Resin')
    expect(out).toContain('Gatherer')
    expect(out).toContain('drain')
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
