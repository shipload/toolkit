import {describe, expect, test} from 'bun:test'
import {Int32, Name, UInt16} from '@wharfkit/antelope'
import {NftManager, ServerTypes} from '../../src'

function makeRow(itemId: number, templateId: number, schemaName: string) {
    return ServerTypes.nftconfig_row.from({
        item_id: UInt16.from(itemId),
        template_id: Int32.from(templateId),
        schema_name: Name.from(schemaName),
    })
}

function makeStubContext(rows: Map<string, unknown>) {
    return {
        server: {
            table(name: string) {
                if (name !== 'nftconfig') {
                    throw new Error(`Unexpected table: ${name}`)
                }
                return {
                    async get(key: unknown): Promise<unknown> {
                        const lookup = UInt16.from(key as any).toString()
                        return rows.get(lookup)
                    },
                }
            },
        },
    } as any
}

describe('NftManager.getNftConfigForItem', () => {
    test('returns templateId and schemaName for a known item', async () => {
        const rows = new Map<string, unknown>()
        rows.set('10200', makeRow(10200, 4242, 'v1.entity'))
        const manager = new NftManager(makeStubContext(rows))

        const result = await manager.getNftConfigForItem(10200)
        expect(result).toEqual({templateId: 4242, schemaName: 'v1.entity'})
    })

    test('accepts a UInt16 wharfkit instance as input', async () => {
        const rows = new Map<string, unknown>()
        rows.set('101', makeRow(101, 7, 'v1.ore'))
        const manager = new NftManager(makeStubContext(rows))

        const result = await manager.getNftConfigForItem(UInt16.from(101))
        expect(result).toEqual({templateId: 7, schemaName: 'v1.ore'})
    })

    test('returns undefined when the row is missing', async () => {
        const manager = new NftManager(makeStubContext(new Map()))
        const result = await manager.getNftConfigForItem(60000)
        expect(result).toBeUndefined()
    })
})
