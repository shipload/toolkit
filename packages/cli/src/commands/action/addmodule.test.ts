import {describe, expect, test} from 'bun:test'
import {pickModulesOverride} from '../../lib/cargo-resolve'
import {buildAction} from './addmodule'

const SIZED = [
    {type: 0, installed: null},
    {type: 0, installed: null},
    {type: 0, installed: null},
    {type: 0, installed: null},
    {type: 0, installed: null},
]

describe('addmodule buildAction', () => {
    test('forwards stored target modules and entity_id into the target cargo_ref', async () => {
        const captured: {target?: unknown} = {}
        const stub = {
            actions: {
                addmodule: (_id: bigint, _idx: number, _mod: unknown, target: unknown) => {
                    captured.target = target
                    return {} as never
                },
            },
        } as never
        await buildAction(
            {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleItemId: 10100n,
                moduleStats: 4444n,
                targetItemId: 10201n,
                targetStats: 196849n,
                targetModules: SIZED as never,
                targetEntityId: 777n,
            } as never,
            stub
        )
        expect((captured.target as {modules: unknown}).modules).toEqual(SIZED)
        expect((captured.target as {entity_id: unknown}).entity_id).toBe(777n)
    })
})

describe('pickModulesOverride', () => {
    test('falls back to resolved modules when --target-modules is absent', () => {
        expect(pickModulesOverride(undefined, SIZED as never)).toEqual(SIZED as never)
    })

    test('parses --target-modules when provided, overriding resolved modules', () => {
        const override = [{type: 1, installed: null}]
        expect(pickModulesOverride(JSON.stringify(override), SIZED as never)).toEqual(
            override as never
        )
    })
})
