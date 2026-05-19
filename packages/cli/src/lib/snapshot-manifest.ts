export interface SnapshotManifest {
    version: 1
    capturedAt: string
    sourceContract: string
    chainId: string
    state: Record<string, unknown>
    nftconfig: Record<string, unknown>[]
    players: Record<string, unknown>[]
    entities: Record<string, unknown>[]
    cargo: Record<string, unknown>[]
    entitygroups: Record<string, unknown>[]
    reserves: {
        scope: number
        rows: Record<string, unknown>[]
    }[]
}

export function manifestToJSON(m: SnapshotManifest): string {
    return JSON.stringify(m, bigintReplacer, 2)
}

export function manifestFromJSON(text: string): SnapshotManifest {
    return JSON.parse(text)
}

function bigintReplacer(_key: string, value: unknown): unknown {
    if (typeof value === 'bigint') return value.toString()
    return value
}
