import {Name, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import {Ship, ShipStateInput} from './ship'
import {Warehouse, WarehouseStateInput} from './warehouse'
import {Container, ContainerStateInput} from './container'

export function makeShip(state: ShipStateInput): Ship {
    const info: Record<string, unknown> = {
        type: Name.from('ship'),
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        cargomass: UInt32.from(0),
        cargo: state.cargo || [],
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
    }
    if (state.hullmass !== undefined) info.hullmass = UInt32.from(state.hullmass)
    if (state.capacity !== undefined) info.capacity = UInt32.from(state.capacity)
    if (state.energy !== undefined) info.energy = UInt16.from(state.energy)
    if (state.engines) info.engines = state.engines
    if (state.generator) info.generator = state.generator
    if (state.loaders) info.loaders = state.loaders
    if (state.schedule) info.schedule = state.schedule
    const entityInfo = ServerContract.Types.entity_info.from(info)
    return new Ship(entityInfo)
}

export function makeWarehouse(state: WarehouseStateInput): Warehouse {
    const entityInfo = ServerContract.Types.entity_info.from({
        type: Name.from('warehouse'),
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        capacity: UInt32.from(state.capacity),
        cargomass: UInt32.from(0),
        cargo: state.cargo || [],
        loaders: state.loaders,
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
        schedule: state.schedule,
    })
    return new Warehouse(entityInfo)
}

export function makeContainer(state: ContainerStateInput): Container {
    const entityInfo = ServerContract.Types.entity_info.from({
        type: Name.from('container'),
        id: UInt64.from(state.id),
        owner: Name.from(state.owner),
        entity_name: state.name,
        coordinates: ServerContract.Types.coordinates.from(state.coordinates),
        hullmass: UInt32.from(state.hullmass),
        capacity: UInt32.from(state.capacity),
        cargomass: UInt32.from(state.cargomass || 0),
        cargo: [],
        is_idle: !state.schedule,
        current_task_elapsed: UInt32.from(0),
        current_task_remaining: UInt32.from(0),
        pending_tasks: [],
        schedule: state.schedule,
    })
    return new Container(entityInfo)
}
