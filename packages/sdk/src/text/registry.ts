export type TextTranslator = (id: string, fallback: string) => string
export type NumberFormatter = (n: number, options?: Intl.NumberFormatOptions) => string

export interface Translator {
    text?: TextTranslator
    number?: NumberFormatter
}

export const SDK_TEXT: Record<string, string> = {}

let translator: Translator = {}

export function setTranslator(next: Translator | undefined): void {
    translator = next ?? {}
}

export function defineText(entries: Record<string, string>): void {
    for (const [id, english] of Object.entries(entries)) {
        const existing = SDK_TEXT[id]
        if (existing !== undefined && existing !== english) {
            throw new Error(`Conflicting SDK text for ${id}: "${existing}" vs "${english}"`)
        }
        SDK_TEXT[id] = english
    }
}

export function hasText(id: string): boolean {
    return SDK_TEXT[id] !== undefined
}

export function text(id: string): string {
    const english = SDK_TEXT[id]
    if (english === undefined) throw new Error(`Unknown SDK text id: ${id}`)
    return translator.text ? translator.text(id, english) : english
}

export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
    return translator.number ? translator.number(n, options) : n.toLocaleString('en-US', options)
}

const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g

export function compose(id: string, params: Readonly<Record<string, string | number>>): string {
    return text(id).replace(PLACEHOLDER, (match, key: string) => {
        const value = params[key]
        if (value === undefined) return match
        return typeof value === 'number' ? formatNumber(value) : value
    })
}

export function textRecord<K extends string | number>(
    entries: Record<K, string>,
    idOf: (key: string) => string
): Record<K, string> {
    const out = {} as Record<K, string>
    for (const [key, english] of Object.entries(entries) as [string, string][]) {
        const id = idOf(key)
        defineText({[id]: english})
        Object.defineProperty(out, key, {get: () => text(id), enumerable: true})
    }
    return out
}

export function textFields<T extends object>(
    target: T,
    fields: Partial<Record<keyof T & string, string>>,
    idOf: (field: string) => string
): T {
    for (const [field, english] of Object.entries(fields) as [string, string][]) {
        const id = idOf(field)
        defineText({[id]: english})
        Object.defineProperty(target, field, {get: () => text(id), enumerable: true})
    }
    return target
}

defineText({
    'compose.plus': '{a} + {b}',
    'compose.times': '{count} × {value}',
    'compose.separator.list': ', ',
    'compose.separator.clauses': '; ',
})
