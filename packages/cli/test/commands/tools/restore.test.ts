import {describe, expect, test} from 'bun:test'
import {buildRestoreSteps, parseRestoreTables} from '../../../src/commands/tools/restore'

describe('tools restore table filters', () => {
    test('parses entity table filter', () => {
        expect([...parseRestoreTables('entity')]).toEqual(['entity'])
    })

    test('parses comma-separated table filters', () => {
        expect([...parseRestoreTables('entity,cargo')]).toEqual(['entity', 'cargo'])
    })

    test('defaults to all tables when filter is absent', () => {
        expect([...parseRestoreTables()]).toEqual([
            'state',
            'nftconfig',
            'entity',
            'cargo',
            'entitygroup',
            'reserve',
        ])
    })

    test('requires skip wipe when a table filter is present', () => {
        expect(() =>
            buildRestoreSteps({tables: parseRestoreTables('entity'), skipWipe: false})
        ).toThrow('--tables requires --skip-wipe')
    })

    test('entity filter emits only dbgimpentity step', () => {
        const steps = buildRestoreSteps({
            tables: parseRestoreTables('entity'),
            skipWipe: true,
        })
        expect(steps.map((s) => s.name)).toEqual(['dbgimpentity'])
    })

    test('full restore behavior includes wipe and all import steps', () => {
        const steps = buildRestoreSteps({
            tables: parseRestoreTables(),
            skipWipe: false,
        })
        expect(steps.map((s) => s.name)).toEqual([
            'dbgwipe',
            'dbgimpstate',
            'setnftcfg',
            'dbgimpentity',
            'dbgimpcargo',
            'dbgimpgroup',
            'dbgimpreserv',
        ])
    })

    test('unknown table names are rejected', () => {
        expect(() => parseRestoreTables('ship')).toThrow('unknown restore table')
    })
})
