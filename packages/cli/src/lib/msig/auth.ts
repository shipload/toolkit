import {PermissionLevel} from '@wharfkit/antelope'

/** Parse "account" or "account@permission" into a PermissionLevel (permission defaults to active). */
export function parseAuth(input: string): PermissionLevel {
    const trimmed = input.trim()
    if (!trimmed) throw new Error('Empty authority')
    return PermissionLevel.from(trimmed.includes('@') ? trimmed : `${trimmed}@active`)
}

/** Parse a comma-separated list of authorities (for --requested). */
export function parseAuthList(input: string): PermissionLevel[] {
    return input
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map(parseAuth)
}
