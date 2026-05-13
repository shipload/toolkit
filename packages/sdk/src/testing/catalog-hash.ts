import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'

export const CATALOG_FILES_REL = [
    'items.json',
    'recipes.json',
    'entities.json',
    'kind-registry.json',
    'item-ids.ts',
] as const

export function computeCatalogHash(filePaths: ReadonlyArray<string>): string {
    const hash = createHash('sha256')
    for (const p of filePaths) {
        hash.update(readFileSync(p))
        hash.update('\0')
    }
    return hash.digest('hex')
}
