import {Name} from '@wharfkit/antelope'
import {
    ITEM_CONTAINER_T1_PACKED,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
} from '../data/item-ids'

export const ENTITY_SHIP = Name.from('ship')
export const ENTITY_WAREHOUSE = Name.from('warehouse')
export const ENTITY_CONTAINER = Name.from('container')

export enum EntityClass {
    OrbitalVessel = 0,
    PlanetaryStructure = 1,
}

export function getEntityClass(entityType: Name | EntityTypeName): EntityClass {
    const typeName = typeof entityType === 'string' ? entityType : entityType.toString()
    switch (typeName) {
        case 'ship':
        case 'container':
            return EntityClass.OrbitalVessel
        case 'warehouse':
            return EntityClass.PlanetaryStructure
        default:
            throw new Error(`Entity type has no class: ${typeName}`)
    }
}

export function getPackedEntityType(itemId: number): Name | null {
    switch (itemId) {
        case ITEM_SHIP_T1_PACKED:
            return ENTITY_SHIP
        case ITEM_CONTAINER_T1_PACKED:
        case ITEM_CONTAINER_T2_PACKED:
            return ENTITY_CONTAINER
        case ITEM_WAREHOUSE_T1_PACKED:
            return ENTITY_WAREHOUSE
        default:
            return null
    }
}

export type EntityTypeName = 'ship' | 'warehouse' | 'container'

export interface EntityTraits {
    typeName: Name
    isMovable: boolean
    hasEnergy: boolean
    hasLoaders: boolean
    notFoundError: string
}

export const shipTraits: EntityTraits = {
    typeName: ENTITY_SHIP,
    isMovable: true,
    hasEnergy: true,
    hasLoaders: true,

    notFoundError: 'ship not found',
}

export const warehouseTraits: EntityTraits = {
    typeName: ENTITY_WAREHOUSE,
    isMovable: false,
    hasEnergy: false,
    hasLoaders: true,

    notFoundError: 'warehouse not found',
}

export const containerTraits: EntityTraits = {
    typeName: ENTITY_CONTAINER,
    isMovable: true,
    hasEnergy: false,
    hasLoaders: false,

    notFoundError: 'container not found',
}

export function getEntityTraits(entityType: Name | EntityTypeName): EntityTraits {
    const typeName = typeof entityType === 'string' ? entityType : entityType.toString()

    switch (typeName) {
        case 'ship':
            return shipTraits
        case 'warehouse':
            return warehouseTraits
        case 'container':
            return containerTraits
        default:
            throw new Error(`Unknown entity type: ${typeName}`)
    }
}

export function isShip(entity: {type?: Name}): boolean {
    return entity.type?.equals(ENTITY_SHIP) ?? false
}

export function isWarehouse(entity: {type?: Name}): boolean {
    return entity.type?.equals(ENTITY_WAREHOUSE) ?? false
}

export function isContainer(entity: {type?: Name}): boolean {
    return entity.type?.equals(ENTITY_CONTAINER) ?? false
}
