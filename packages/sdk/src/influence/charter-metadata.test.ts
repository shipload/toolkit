import {describe, expect, test} from 'bun:test'

import {CHARTER_REGISTRY} from './charters'
import {charterMetadata, charterName, charterSummary} from './charter-metadata'

describe('charter metadata', () => {
    test('covers every node in the chain-synced registry', () => {
        const missing = CHARTER_REGISTRY.filter((node) => !charterMetadata[node.nodeId])
        expect(missing).toEqual([])
    })

    test('carries no entry for a node the registry does not define', () => {
        const known = new Set(CHARTER_REGISTRY.map((node) => node.nodeId))
        const orphans = Object.keys(charterMetadata)
            .map(Number)
            .filter((nodeId) => !known.has(nodeId))
        expect(orphans).toEqual([])
    })

    test('every entry has a name and a summary', () => {
        for (const node of CHARTER_REGISTRY) {
            expect(charterName(node.nodeId).length).toBeGreaterThan(0)
            expect(charterSummary(node.nodeId).length).toBeGreaterThan(0)
        }
    })

    test('falls back to a node-numbered name for an unknown id', () => {
        expect(charterName(9999)).toBe('Node 9999')
        expect(charterSummary(9999)).toBe('')
    })
})
