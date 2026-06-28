import {describe, expect, test} from 'bun:test'
import {formatReserve} from './format'

describe('formatReserve', () => {
  test('renders tonnes for full and partial reserves', () => {
    expect(formatReserve(288_000, 288_000)).toBe('288k t')
    expect(formatReserve(144_000, 288_000)).toBe('144k t / 288k t (50%)')
  })
})
