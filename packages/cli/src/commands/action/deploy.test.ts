import {describe, expect, test} from 'bun:test'
import {resolveCargoInputs} from '../../lib/cargo-resolve'
import {buildAction} from './deploy'

const SIZED = [
    {type: 0, installed: null},
    {type: 0, installed: null},
    {type: 0, installed: null},
    {type: 0, installed: null},
    {type: 0, installed: null},
]

describe('deploy buildAction', () => {
    test('resolveCargoInputs returns the matched stack modules and entity id', () => {
        const cargo = [
            {item_id: 10201, stats: 196849n, quantity: 4n, modules: SIZED, entity_id: undefined},
        ] as never
        const [r] = resolveCargoInputs([{itemId: 10201, stackId: 196849n, quantity: 1}], cargo)
        expect(r.modules).toEqual(SIZED as never)
        expect(r.entityId).toBeUndefined()
    })

    test('buildAction forwards modules into the cargo_ref', async () => {
        const captured: {ref?: unknown} = {}
        const stub = {
            actions: {
                deploy: (_id: bigint, ref: unknown, _slot: unknown) => {
                    captured.ref = ref
                    return {} as never
                },
            },
        } as never
        await buildAction(
            {
                entityType: 'warehouse',
                entityId: 6n,
                packedItemId: 10201,
                stackId: 196849n,
                modules: SIZED as never,
            },
            stub
        )
        expect((captured.ref as {modules: unknown}).modules).toEqual(SIZED)
    })
})
