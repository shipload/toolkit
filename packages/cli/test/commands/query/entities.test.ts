import {expect, test} from 'bun:test'
import {renderFull, renderSummaries} from '../../../src/commands/query/entities'

test('entities summary renders type, id, name, status for each row', () => {
    const out = renderSummaries('alice', [
        {type: 'ship', id: 1n, entity_name: 'Voyager', is_idle: true},
        {type: 'warehouse', id: 9n, entity_name: 'Depot Alpha', is_idle: false},
    ] as any)
    expect(out).toContain('alice')
    expect(out).toContain('ship')
    expect(out).toContain('warehouse')
    expect(out).toContain('Voyager')
    expect(out).toContain('Depot Alpha')
    expect(out).toContain('idle')
    expect(out).toContain('busy')
})

test('entities full renders formatEntity output per row', () => {
    const out = renderFull('alice', [
        {
            id: 1,
            entity_name: 'Voyager',
            owner: 'alice',
            type: 'ship',
            is_idle: true,
            coordinates: {x: 0, y: 0},
            cargo: [],
            pending_tasks: [],
            current_task_remaining: 0,
        } as any,
    ])
    expect(out).toContain('Voyager')
    expect(out).toContain('alice')
})
