import type {Command} from 'commander'
import {server} from '../../lib/client'
import {formatItem, formatOutput} from '../../lib/format'

interface SchemaField {
    name: string
    field_type: string
}

interface NftSchema {
    schema_name: string
    fields: SchemaField[]
}

interface NftTemplate {
    item_id: number
    schema_name: string
}

interface NftInfo {
    schemas: NftSchema[]
    templates: NftTemplate[]
}

export function renderPretty(input: NftInfo): string {
    const schemas = input.schemas ?? []
    const templates = input.templates ?? []
    const lines = [`NFT schemas (${schemas.length}):`]
    for (const s of schemas) {
        const fields = s.fields.map((f) => `${f.name}:${f.field_type}`).join(', ')
        lines.push(`  ${s.schema_name}  [${fields}]`)
    }
    lines.push('', `NFT templates (${templates.length}):`)
    for (const t of templates) {
        lines.push(`  ${formatItem(t.item_id).padEnd(28)}  schema: ${t.schema_name}`)
    }
    return lines.join('\n')
}

export function render(input: NftInfo, raw: boolean): string {
    if (raw) return JSON.stringify(input, null, 2)
    return renderPretty(input)
}

export function register(program: Command): void {
    program
        .command('nftinfo')
        .description('List NFT schemas and item→schema templates')
        .option('--raw', 'emit raw JSON')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (options: {raw?: boolean; json?: boolean}) => {
            const result = (await server.readonly('getnftinfo', {})) as unknown as NftInfo
            console.log(
                formatOutput(
                    result,
                    {json: Boolean(options.json) || Boolean(options.raw)},
                    renderPretty
                )
            )
        })
}
