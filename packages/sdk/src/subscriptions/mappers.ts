import {ServerContract} from '../contracts'
import {Entity} from '../entities/entity'
import type {WireEntity} from './types'

export function mapEntity(ei: ServerContract.Types.entity_info): Entity {
    return new Entity(ei)
}

export function parseWireEntity(raw: WireEntity): ServerContract.Types.entity_info {
    const shaped: Record<string, unknown> = {...raw}

    if (typeof shaped.type === 'number' && typeof shaped.type_name === 'string') {
        shaped.type = shaped.type_name
    }
    delete shaped.type_name

    if (shaped.entity_name === undefined && typeof shaped.name === 'string') {
        shaped.entity_name = shaped.name
    }
    delete shaped.name

    return ServerContract.Types.entity_info.from(shaped)
}
