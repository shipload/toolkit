export interface DisplayNameResult {
    valid: boolean
    reason?: string
    name: string
}

const MAX_DISPLAY_NAME_BYTES = 32
const ASCII_SPACE = 0x20
const ZERO_WIDTH_CODE_POINTS = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff])
const textEncoder = new TextEncoder()

function isControlCharacter(codePoint: number): boolean {
    return codePoint <= 0x1f || codePoint === 0x7f || (codePoint >= 0x80 && codePoint <= 0x9f)
}

function isLoneSurrogate(codePoint: number): boolean {
    return codePoint >= 0xd800 && codePoint <= 0xdfff
}

function isBidiControl(codePoint: number): boolean {
    return (
        (codePoint >= 0x202a && codePoint <= 0x202e) || (codePoint >= 0x2066 && codePoint <= 0x2069)
    )
}

function isInvalidDisplayNameCodePoint(codePoint: number): boolean {
    return (
        isControlCharacter(codePoint) ||
        isLoneSurrogate(codePoint) ||
        ZERO_WIDTH_CODE_POINTS.has(codePoint) ||
        isBidiControl(codePoint)
    )
}

export function normalizeDisplayName(input: string): string {
    let start = 0
    let end = input.length

    while (start < end && input.charCodeAt(start) === ASCII_SPACE) start++
    while (end > start && input.charCodeAt(end - 1) === ASCII_SPACE) end--

    return input.slice(start, end)
}

export function validateDisplayName(input: string): DisplayNameResult {
    const name = normalizeDisplayName(input)

    if (name.length === 0) return {valid: false, reason: 'empty', name}
    if (textEncoder.encode(name).length > MAX_DISPLAY_NAME_BYTES) {
        return {valid: false, reason: 'too_long', name}
    }

    for (const character of name) {
        const codePoint = character.codePointAt(0)!
        if (isInvalidDisplayNameCodePoint(codePoint)) {
            return {valid: false, reason: 'invalid_char', name}
        }
    }

    return {valid: true, name}
}
