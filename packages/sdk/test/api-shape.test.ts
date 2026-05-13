import {expect, test} from 'bun:test'
import {Entity, EntitiesManager} from '../src'

test('Entity public surface', () => {
    const props = Object.getOwnPropertyNames(Entity.prototype).sort()
    expect(props).toMatchSnapshot()
})

test('EntitiesManager method surface', () => {
    const props = Object.getOwnPropertyNames(EntitiesManager.prototype).sort()
    expect(props).toMatchSnapshot()
})
