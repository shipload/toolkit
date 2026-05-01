import {describe, expect, test} from 'bun:test'
import {type Hotkey, HotkeyRegistry} from '../../src/tui/hotkeys'

describe('HotkeyRegistry', () => {
    test('dispatches by key name when the binding is enabled', () => {
        const calls: string[] = []
        const reg = new HotkeyRegistry([
            {key: 'r', label: 'resolve', action: () => calls.push('r'), enabled: () => true},
        ])
        expect(reg.dispatch('r')).toBe(true)
        expect(calls).toEqual(['r'])
    })

    test('does not dispatch when the binding is disabled', () => {
        const calls: string[] = []
        const reg = new HotkeyRegistry([
            {key: 'r', label: 'resolve', action: () => calls.push('r'), enabled: () => false},
        ])
        expect(reg.dispatch('r')).toBe(false)
        expect(calls).toEqual([])
    })

    test('returns false for unbound keys', () => {
        const reg = new HotkeyRegistry([])
        expect(reg.dispatch('z')).toBe(false)
    })

    test('hints reflect enabled state', () => {
        const reg = new HotkeyRegistry<Hotkey>([
            {key: 'r', label: 'resolve', action: () => {}, enabled: () => false},
            {key: 'q', label: 'quit', action: () => {}, enabled: () => true},
        ])
        expect(reg.hints()).toEqual([
            {key: 'r', label: 'resolve', enabled: false},
            {key: 'q', label: 'quit', enabled: true},
        ])
    })

    test('dispatches shift-bound hotkey only on shift+key', () => {
        let unshifted = 0
        let shifted = 0
        const reg = new HotkeyRegistry([
            {
                key: 'r',
                label: 'lower',
                enabled: () => true,
                action: () => {
                    unshifted++
                },
            },
            {
                key: 'r',
                shift: true,
                label: 'upper',
                enabled: () => true,
                action: () => {
                    shifted++
                },
            },
        ])
        reg.dispatch('r', false)
        reg.dispatch('r', true)
        expect(unshifted).toBe(1)
        expect(shifted).toBe(1)
    })

    test('dispatch defaults shift to false', () => {
        let calls = 0
        const reg = new HotkeyRegistry([
            {
                key: 'r',
                label: 'lower',
                enabled: () => true,
                action: () => {
                    calls++
                },
            },
        ])
        reg.dispatch('r')
        expect(calls).toBe(1)
    })

    test('hints expose modifier in label format', () => {
        const reg = new HotkeyRegistry([
            {key: 'r', shift: true, label: 'resolve all', enabled: () => true, action: () => {}},
        ])
        const hint = reg.hints()[0]
        expect(hint.key).toBe('r')
        expect(hint.modifier).toBe('shift')
    })

    test('hints omit modifier for unshifted keys', () => {
        const reg = new HotkeyRegistry([
            {key: 'r', label: 'resolve', enabled: () => true, action: () => {}},
        ])
        const hint = reg.hints()[0]
        expect(hint.key).toBe('r')
        expect(hint.modifier).toBeUndefined()
    })
})
