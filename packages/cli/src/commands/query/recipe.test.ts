import {expect, test} from 'bun:test'
import {getRecipeConsumers, getComponentDemand} from '@shipload/sdk'
import {renderWhereUsed, renderDemand} from './recipe'

const ITEM_SENSOR = 10006

test('renderWhereUsed shows the gatherer drain flow and marks the extractor as a sink', () => {
    const out = renderWhereUsed(ITEM_SENSOR, getRecipeConsumers(ITEM_SENSOR))
    expect(out).toContain('Sensor')
    expect(out).toContain('Gatherer')
    expect(out).toContain('drain')
    expect(out).toMatch(/Extractor.*sink|sink.*Extractor/s)
})

test('renderDemand surfaces Resin as the least-used component', () => {
    const out = renderDemand(getComponentDemand())
    expect(out).toContain('Resin')
    const resinLine = out.split('\n').find((l) => l.includes('Resin'))
    expect(resinLine).toContain('1')
})
