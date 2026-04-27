import type {EntityTypeName} from '../../lib/args'
import {server} from '../../lib/client'
import {formatEntity, formatOutput} from '../../lib/format'

export function render(info: unknown): string {
    // biome-ignore lint/suspicious/noExplicitAny: readonly response is loosely typed
    return formatEntity(info as any)
}

export async function defaultShow(type: EntityTypeName, id: bigint): Promise<void> {
    const data = await server.readonly('getentity', {entity_type: type, entity_id: id})
    console.log(formatOutput(data, {json: false}, render))
}
