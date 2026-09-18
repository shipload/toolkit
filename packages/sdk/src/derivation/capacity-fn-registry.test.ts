import {expect, test} from 'bun:test'
import {resolveCapacityFnName} from './capacity-fn-registry'
import kindRegistryJson from '../data/kind-registry.json'

test('every template in the catalog resolves to a known capacity function', () => {
    for (const t of kindRegistryJson.templates as {itemId: number}[]) {
        expect(() => resolveCapacityFnName(t.itemId)).not.toThrow()
    }
})
