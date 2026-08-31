import {describe, expect, test} from 'bun:test'

import {CHARTER_REGISTRY, type CharterNode} from './charters'
import {
    charterMetadata,
    charterName,
    charterSignature,
    charterSummary,
    romanNumeral,
    type CharterSignature,
} from './charter-metadata'

function nodeById(nodeId: number): CharterNode {
    const node = CHARTER_REGISTRY.find((candidate) => candidate.nodeId === nodeId)
    if (!node) throw new Error(`no charter node ${nodeId} in the registry`)
    return node
}

function signatureFor(nodeId: number): CharterSignature {
    const signature = charterSignature(nodeById(nodeId))
    if (!signature) throw new Error(`no signature for charter node ${nodeId}`)
    return signature
}

function sharesWord(name: string, label: string): boolean {
    const haystack = name.toLowerCase()
    return label
        .split(/\s+/)
        .filter((word) => word.length > 2)
        .some((word) => haystack.includes(word.toLowerCase()))
}

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
        expect(charterName(9999)).toBe('Charter 9999')
        expect(charterSummary(9999)).toBe('')
    })
})

describe('charter names agree with the effect they are derived from', () => {
    for (const node of CHARTER_REGISTRY) {
        const signature = signatureFor(node.nodeId)
        const name = charterName(node.nodeId)

        if (signature.kind === 'spawn') {
            test(`node ${node.nodeId} names the entity it spawns (${signature.entityLabel})`, () => {
                expect(sharesWord(name, signature.entityLabel)).toBeTrue()
            })
            continue
        }

        test(`node ${node.nodeId} names its refit target or module`, () => {
            const named =
                sharesWord(name, signature.targetLabel) || sharesWord(name, signature.moduleLabel)
            expect(named).toBeTrue()
        })

        if (signature.rankCount > 1) {
            test(`node ${node.nodeId} carries rank ${signature.rank} of ${signature.rankCount}`, () => {
                expect(name.endsWith(` ${romanNumeral(signature.rank)}`)).toBeTrue()
            })
        }
    }
})

describe('charter signatures', () => {
    test('reads the depot spawn from the chain-synced template registry', () => {
        expect(signatureFor(6)).toEqual({kind: 'spawn', entityLabel: 'Depot'})
    })

    test('ranks the depot storage refits by their prereq chain', () => {
        expect([7, 8, 9, 10].map(signatureFor)).toEqual([
            {kind: 'refit', targetLabel: 'Depot', moduleLabel: 'Cargo Hold', rank: 1, rankCount: 4},
            {kind: 'refit', targetLabel: 'Depot', moduleLabel: 'Cargo Hold', rank: 2, rankCount: 4},
            {kind: 'refit', targetLabel: 'Depot', moduleLabel: 'Cargo Hold', rank: 3, rankCount: 4},
            {kind: 'refit', targetLabel: 'Depot', moduleLabel: 'Cargo Hold', rank: 4, rankCount: 4},
        ])
    })

    test('ranks the depot loader refits by their prereq chain', () => {
        expect([11, 12, 13, 14].map(signatureFor)).toEqual([
            {
                kind: 'refit',
                targetLabel: 'Depot',
                moduleLabel: 'Shuttle Bay',
                rank: 1,
                rankCount: 4,
            },
            {
                kind: 'refit',
                targetLabel: 'Depot',
                moduleLabel: 'Shuttle Bay',
                rank: 2,
                rankCount: 4,
            },
            {
                kind: 'refit',
                targetLabel: 'Depot',
                moduleLabel: 'Shuttle Bay',
                rank: 3,
                rankCount: 4,
            },
            {
                kind: 'refit',
                targetLabel: 'Depot',
                moduleLabel: 'Shuttle Bay',
                rank: 4,
                rankCount: 4,
            },
        ])
    })

    test('treats a lone refit as an unranked tune-up', () => {
        expect(signatureFor(4)).toEqual({
            kind: 'refit',
            targetLabel: 'Workshop',
            moduleLabel: 'Fabricator',
            rank: 1,
            rankCount: 1,
        })
    })
})
