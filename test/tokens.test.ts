import { expect, test } from 'bun:test'
import { tokens } from '../src/tokens/index.ts'

test('colors include all resource categories', () => {
  for (const cat of ['metal', 'gas', 'mineral', 'organic', 'precious']) {
    expect(tokens.colors.category).toHaveProperty(cat)
    expect(tokens.colors.category[cat as keyof typeof tokens.colors.category]).toMatch(/^#[0-9a-f]{6}$/i)
  }
})

test('colors include all tiers t1..t5', () => {
  for (const t of ['t1', 't2', 't3', 't4', 't5']) {
    expect(tokens.colors.tier).toHaveProperty(t)
  }
})

test('typography names three font stacks', () => {
  expect(tokens.typography.display).toContain('Orbitron')
  expect(tokens.typography.sans).toContain('Inter')
  expect(tokens.typography.mono).toContain('JetBrains Mono')
})

test('spacing has a default panel width', () => {
  expect(tokens.spacing.panelWidth).toBe(280)
})
