export interface Hotkey {
    key: string
    shift?: boolean
    label: string
    action: () => void | Promise<void>
    enabled: () => boolean
}

export interface HotkeyHint {
    key: string
    modifier?: 'shift'
    label: string
    enabled: boolean
}

export class HotkeyRegistry<T extends Hotkey = Hotkey> {
    private byKey = new Map<string, {plain?: T; shift?: T}>()

    constructor(initial: T[] = []) {
        for (const h of initial) this.add(h)
    }

    add(hotkey: T): void {
        let entry = this.byKey.get(hotkey.key)
        if (!entry) {
            entry = {}
            this.byKey.set(hotkey.key, entry)
        }
        if (hotkey.shift) entry.shift = hotkey
        else entry.plain = hotkey
    }

    all(): T[] {
        const out: T[] = []
        for (const e of this.byKey.values()) {
            if (e.plain) out.push(e.plain)
            if (e.shift) out.push(e.shift)
        }
        return out
    }

    hints(): HotkeyHint[] {
        return this.all().map((h) => {
            const hint: HotkeyHint = {
                key: h.key,
                label: h.label,
                enabled: h.enabled(),
            }
            if (h.shift) hint.modifier = 'shift'
            return hint
        })
    }

    dispatch(keyName: string, shift = false): boolean {
        const entry = this.byKey.get(keyName)
        const hk = entry ? (shift ? entry.shift : entry.plain) : undefined
        if (!hk || !hk.enabled()) return false
        void hk.action()
        return true
    }
}
