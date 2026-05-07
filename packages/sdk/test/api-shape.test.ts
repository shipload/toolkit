import {expect, test} from 'bun:test'
import {Container, Extractor, Ship, Warehouse, EntitiesManager} from '../src'

test('Ship public surface', () => {
    const props = Object.getOwnPropertyNames(Ship.prototype).sort()
    expect(props).toMatchSnapshot()
})

test('Warehouse public surface', () => {
    const props = Object.getOwnPropertyNames(Warehouse.prototype).sort()
    expect(props).toMatchSnapshot()
})

test('Container public surface', () => {
    const props = Object.getOwnPropertyNames(Container.prototype).sort()
    expect(props).toMatchSnapshot()
})

test('Extractor public surface', () => {
    const props = Object.getOwnPropertyNames(Extractor.prototype).sort()
    expect(props).toMatchSnapshot()
})

test('EntitiesManager method surface', () => {
    const props = Object.getOwnPropertyNames(EntitiesManager.prototype).sort()
    expect(props).toMatchSnapshot()
})
