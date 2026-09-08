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

describe('charter names agree with the grant they are derived from', () => {
    for (const node of CHARTER_REGISTRY) {
        const signature = signatureFor(node.nodeId)
        const name = charterName(node.nodeId)

        test(`node ${node.nodeId} names the building it grants (${signature.buildingLabel})`, () => {
            expect(sharesWord(name, signature.buildingLabel)).toBeTrue()
        })

        if (signature.kind !== 'gate' && signature.rankCount > 1) {
            test(`node ${node.nodeId} carries rank ${signature.rank} of ${signature.rankCount}`, () => {
                expect(name.endsWith(` ${romanNumeral(signature.rank)}`)).toBeTrue()
            })
        }
    }
})

describe('charter signatures', () => {
    test('reads the depot level gate from its grant list', () => {
        expect(signatureFor(40100001)).toEqual({kind: 'gate', buildingLabel: 'Depot', level: 1})
    })

    test('ranks the depot bays by their prereq chain', () => {
        expect([40100101, 40100102, 40100103, 40100104].map(signatureFor)).toEqual(
            [1, 2, 3, 4].map((rank) => ({
                kind: 'module',
                buildingLabel: 'Depot',
                count: 1,
                rank,
                rankCount: 4,
            }))
        )
    })

    test('ranks the depot transfer rungs by their prereq chain', () => {
        expect([40100401, 40100402, 40100403, 40100404].map(signatureFor)).toEqual([
            {
                kind: 'rung',
                buildingLabel: 'Depot',
                statLabel: 'transfer speed',
                rank: 1,
                rankCount: 4,
            },
            {
                kind: 'rung',
                buildingLabel: 'Depot',
                statLabel: 'transfer speed',
                rank: 2,
                rankCount: 4,
            },
            {
                kind: 'rung',
                buildingLabel: 'Depot',
                statLabel: 'transfer speed',
                rank: 3,
                rankCount: 4,
            },
            {
                kind: 'rung',
                buildingLabel: 'Depot',
                statLabel: 'transfer speed',
                rank: 4,
                rankCount: 4,
            },
        ])
    })

    test('treats a lone rung as an unranked tune-up', () => {
        expect(signatureFor(10100201)).toEqual({
            kind: 'rung',
            buildingLabel: 'Workshop',
            statLabel: 'crafting speed',
            rank: 1,
            rankCount: 1,
        })
    })
})
