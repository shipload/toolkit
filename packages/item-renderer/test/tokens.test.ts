import {expect, test} from 'bun:test'
import {tierColors as sdkTierColors} from '@shipload/sdk'
import {tokens} from '../src/tokens/index.ts'

test('colors include all resource categories', () => {
    for (const cat of ['ore', 'crystal', 'gas', 'regolith', 'biomass']) {
        expect(tokens.colors.category).toHaveProperty(cat)
        expect(tokens.colors.category[cat as keyof typeof tokens.colors.category]).toMatch(
            /^#[0-9a-f]{6}$/i
        )
    }
})

test('colors.tier is sourced from SDK tierColors', () => {
    expect(tokens.colors.tier).toEqual(sdkTierColors)
})

test('colors include all tiers 1..5 with SDK values', () => {
    expect(tokens.colors.tier[1]).toBe('#8b8b8b')
    expect(tokens.colors.tier[2]).toBe('#4ade80')
    expect(tokens.colors.tier[3]).toBe('#818cf8')
    expect(tokens.colors.tier[4]).toBe('#c084fc')
    expect(tokens.colors.tier[5]).toBe('#fbbf24')
})

test('typography names three font stacks', () => {
    expect(tokens.typography.display).toContain('Orbitron')
    expect(tokens.typography.sans).toContain('Inter')
    expect(tokens.typography.mono).toContain('JetBrains Mono')
})

test('spacing has a default panel width', () => {
    expect(tokens.spacing.panelWidth).toBe(280)
})
