import {Name} from '@wharfkit/antelope'

export const ENTITY_SHIP = Name.from('ship')
export const ENTITY_WAREHOUSE = Name.from('warehouse')
export const ENTITY_CONTAINER = Name.from('container')

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
