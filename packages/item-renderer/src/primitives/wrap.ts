export interface WrapProps {
    value: string
    charsPerLine: number
}

export function wrapText({value, charsPerLine}: WrapProps): string[] {
    const words = value.split(/\s+/).filter((w) => w.length > 0)
    const lines: string[] = []
    let current = ''
    for (const word of words) {
        if (current.length === 0) {
            current = word
            continue
        }
        if (current.length + 1 + word.length <= charsPerLine) {
            current += ` ${word}`
        } else {
            lines.push(current)
            current = word
        }
    }
    if (current.length > 0) lines.push(current)
    return lines
}
