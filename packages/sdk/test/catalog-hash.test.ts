import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import {writeFileSync, mkdtempSync, rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {computeCatalogHash} from '../src/testing/catalog-hash'

describe('computeCatalogHash', () => {
    let dir: string

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'catalog-hash-'))
    })

    afterEach(() => {
        rmSync(dir, {recursive: true, force: true})
    })

    test('identical inputs produce identical hash', () => {
        writeFileSync(join(dir, 'a.json'), '{"x":1}')
        writeFileSync(join(dir, 'b.json'), '{"y":2}')
        const h1 = computeCatalogHash([join(dir, 'a.json'), join(dir, 'b.json')])
        const h2 = computeCatalogHash([join(dir, 'a.json'), join(dir, 'b.json')])
        expect(h1).toBe(h2)
        expect(h1).toMatch(/^[0-9a-f]{64}$/)
    })

    test('changing one input changes the hash', () => {
        writeFileSync(join(dir, 'a.json'), '{"x":1}')
        writeFileSync(join(dir, 'b.json'), '{"y":2}')
        const h1 = computeCatalogHash([join(dir, 'a.json'), join(dir, 'b.json')])
        writeFileSync(join(dir, 'a.json'), '{"x":2}')
        const h2 = computeCatalogHash([join(dir, 'a.json'), join(dir, 'b.json')])
        expect(h1).not.toBe(h2)
    })

    test('order-sensitive', () => {
        writeFileSync(join(dir, 'a.json'), '{"x":1}')
        writeFileSync(join(dir, 'b.json'), '{"y":2}')
        const h1 = computeCatalogHash([join(dir, 'a.json'), join(dir, 'b.json')])
        const h2 = computeCatalogHash([join(dir, 'b.json'), join(dir, 'a.json')])
        expect(h1).not.toBe(h2)
    })
})
