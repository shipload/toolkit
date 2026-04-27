export interface Hotkey {
    key: string
    label: string
    action: () => void | Promise<void>
    enabled: () => boolean
}

export interface HotkeyHint {
    key: string
    label: string
    enabled: boolean
}

export class HotkeyRegistry<T extends Hotkey = Hotkey> {
    private byKey = new Map<string, T>()

    constructor(initial: T[] = []) {
        for (const h of initial) this.byKey.set(h.key, h)
    }

    add(hotkey: T): void {
        this.byKey.set(hotkey.key, hotkey)
    }

    all(): T[] {
        return Array.from(this.byKey.values())
    }

    hints(): HotkeyHint[] {
        return this.all().map((h) => ({
            key: h.key,
            label: h.label,
            enabled: h.enabled(),
        }))
    }

    dispatch(keyName: string): boolean {
        const hk = this.byKey.get(keyName)
        if (!hk || !hk.enabled()) return false
        void hk.action()
        return true
    }
}
