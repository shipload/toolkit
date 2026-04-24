import {ServerContract} from '../contracts'
import {Ship} from '../entities/ship'
import {Warehouse} from '../entities/warehouse'
import {Container} from '../entities/container'
import type {WireEntity} from './types'

export function mapEntity(ei: ServerContract.Types.entity_info): Ship | Warehouse | Container {
    if (ei.type.equals('ship')) return new Ship(ei)
    if (ei.type.equals('warehouse')) return new Warehouse(ei)
    if (ei.type.equals('container')) return new Container(ei)
    throw new Error(`mapEntity: unknown entity type ${ei.type.toString()}`)
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
