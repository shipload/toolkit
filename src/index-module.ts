export * from './contracts'
export * from './errors'
export * from './types'

import {ServerContract} from './contracts'

export {Shipload} from './shipload'
export {Ship} from './entities/ship'
export type {ShipStateInput} from './entities/ship'
export {Warehouse} from './entities/warehouse'
export type {WarehouseStateInput} from './entities/warehouse'
export {Container} from './entities/container'
export type {ContainerStateInput} from './entities/container'
export {makeShip, makeWarehouse, makeContainer} from './entities/makers'

export type movement_stats = ServerContract.Types.movement_stats
export type energy_stats = ServerContract.Types.energy_stats
export type loader_stats = ServerContract.Types.loader_stats
export type schedule = ServerContract.Types.schedule
export type task = ServerContract.Types.task
export type cargo_item = ServerContract.Types.cargo_item
export type warehouse_row = ServerContract.Types.warehouse_row
export type container_row = ServerContract.Types.container_row
export type extractor_stats = ServerContract.Types.extractor_stats

export type location_static = ServerContract.Types.location_static
export type location_epoch = ServerContract.Types.location_epoch
export type location_derived = ServerContract.Types.location_derived
export type location_row = ServerContract.Types.location_row
export {Player} from './entities/player'
export type {PlayerStateInput} from './entities/player'
export {EntityInventory} from './entities/entity-inventory'
export {Location, toLocation} from './entities/location'
export {GameState} from './entities/gamestate'

export {
    EntitiesManager,
    PlayersManager,
    LocationsManager,
    EpochsManager,
    ActionsManager,
} from './managers'
export type {EntityType} from './managers'
export type {EntityRefInput} from './managers/actions'

export {getItem, getItems, itemIds} from './market/items'
export {getCurrentEpoch, getEpochInfo} from './scheduling/epoch'
export type {EpochInfo} from './scheduling/epoch'
export {
    getSystemName,
    hasSystem,
    getLocationType,
    getLocationTypeName,
    isExtractableLocation,
    deriveLocationStatic,
    deriveLocationEpoch,
    deriveLocation,
} from './utils/system'

export {
    deriveStratum,
    deriveResourceStats,
    deriveLocationSize,
    getEligibleResources,
    getResourceWeight,
    getLocationCandidates,
    getDepthThreshold,
    getResourceTier,
    depthScaleFactor,
    DEPTH_THRESHOLD_T1,
    DEPTH_THRESHOLD_T2,
    DEPTH_THRESHOLD_T3,
    DEPTH_THRESHOLD_T4,
    DEPTH_THRESHOLD_T5,
    LOCATION_MIN_DEPTH,
    LOCATION_MAX_DEPTH,
    PLANET_SUBTYPE_GAS_GIANT,
    PLANET_SUBTYPE_ROCKY,
    PLANET_SUBTYPE_TERRESTRIAL,
    PLANET_SUBTYPE_ICY,
    PLANET_SUBTYPE_OCEAN,
    PLANET_SUBTYPE_INDUSTRIAL,
} from './derivation'

export type {StratumInfo, ResourceStats} from './derivation'

export {getStatDefinitions, getStatName, resolveStats} from './derivation'
export type {StatDefinition, NamedStats} from './derivation'

export {hash, hash512} from './utils/hash'

export {
    distanceBetweenCoordinates,
    distanceBetweenPoints,
    findNearbyPlanets,
    lerp,
    rotation,
    calc_ship_mass,
    calc_acceleration,
    calc_flighttime,
    calc_ship_flighttime,
    calc_ship_acceleration,
    calc_rechargetime,
    calc_ship_rechargetime,
    calc_loader_flighttime,
    calc_loader_acceleration,
    calc_energyusage,
    calc_orbital_altitude,
    calc_transfer_duration,
    calculateTransferTime,
    calculateLoadTimeBreakdown,
    calculateRefuelingTime,
    calculateFlightTime,
    estimateTravelTime,
    estimateDealTravelTime,
    hasEnergyForDistance,
    getFlightOrigin,
    getDestinationLocation,
    getPositionAt,
} from './travel/travel'
export type {
    LoadTimeBreakdown,
    EstimatedTravelTime,
    EstimateTravelTimeOptions,
    TransferEntity,
    HasScheduleAndLocation,
} from './travel/travel'

export * as schedule from './scheduling/schedule'
export type {Scheduleable, ScheduleData} from './scheduling/schedule'
export {ScheduleAccessor, createScheduleAccessor} from './scheduling/accessor'
export {InventoryAccessor, createInventoryAccessor} from './entities/inventory-accessor'
export type {HasCargo} from './entities/inventory-accessor'

export * as cargoUtils from './entities/cargo-utils'
export type {CargoData} from './entities/cargo-utils'

export {projectEntity, projectEntityAt, createProjectedEntity} from './scheduling/projection'
export type {Projectable, ProjectedEntity} from './scheduling/projection'

export * from './types/capabilities'
export * from './types/entity'
export * from './capabilities'

export {
    categoryColors,
    tierColors,
    categoryIcons,
    componentIcon,
    moduleIcon,
    itemIcons,
} from './data/colors'

export {itemTier, itemOffset, itemCategory, isRelatedItem, isCraftedItem} from './data/tiers'
export type {CraftedItemCategory} from './data/tiers'

export {getCategoryInfo} from './data/categories'
export type {CategoryInfo} from './data/categories'

export {getPlanetSubtypes, getPlanetSubtype} from './data/locations'
export type {PlanetSubtypeInfo} from './data/locations'

export {
    capabilityNames,
    capabilityAttributes,
    statMappings,
    isInvertedAttribute,
    getCapabilityAttributes,
    getStatMappings,
    getStatMappingsForStat,
    getStatMappingsForCapability,
} from './data/capabilities'
export type {CapabilityAttribute, StatMapping} from './data/capabilities'

export {
    components,
    entityRecipes,
    moduleRecipes,
    getComponentById,
    getEntityRecipe,
    getEntityRecipeByItemId,
    getModuleRecipe,
    getModuleRecipeByItemId,
    getAllCraftableItems,
    getComponentsForCategory,
    getComponentsForStat,
    ITEM_HULL_PLATES,
    ITEM_CARGO_LINING,
    ITEM_CONTAINER_T1_PACKED,
    ITEM_THRUSTER_CORE,
    ITEM_POWER_CELL,
    ITEM_ENGINE_T1,
    ITEM_GENERATOR_T1,
    ITEM_SHIP_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
    ITEM_DRILL_SHAFT,
    ITEM_EXTRACTION_PROBE,
    ITEM_CARGO_ARM,
    ITEM_TOOL_BIT,
    ITEM_REACTION_CHAMBER,
    ITEM_EXTRACTOR_T1,
    ITEM_LOADER_T1,
    ITEM_MANUFACTURING_T1,
    ITEM_STORAGE_T1,
    ITEM_HULL_PLATES_T2,
    ITEM_CARGO_LINING_T2,
    ITEM_CONTAINER_T2_PACKED,
    ITEM_FOCUSING_ARRAY,
} from './data/recipes'
export type {
    ComponentDefinition,
    ComponentStat,
    RecipeInput,
    EntityRecipe,
    ModuleRecipe,
    ModuleSlot,
    CraftableItem,
} from './data/recipes'

export {
    encodeStats,
    decodeStat,
    decodeStats,
    decodeCraftedItemStats,
    blendStacks,
    computeComponentStats,
    blendComponentStacks,
    computeEntityStats,
    blendCargoStacks,
    blendCrossGroup,
    categoryItemMass,
    computeInputMass,
} from './derivation/crafting'
export type {StackInput, CategoryStacks} from './derivation/crafting'

export {computeContainerCapabilities, computeContainerT2Capabilities} from './entities/container'

export {
    computeShipHullCapabilities,
    computeEngineCapabilities,
    computeGeneratorCapabilities,
    computeExtractorCapabilities,
    computeHaulerCapabilities,
    computeLoaderCapabilities,
    computeManufacturingCapabilities,
    computeWarehouseHullCapabilities,
    computeStorageCapabilities,
    computeShipCapabilities,
} from './entities/ship-deploy'
export type {ShipCapabilities} from './entities/ship-deploy'

export {resolveItem} from './resolution/resolve-item'
export type {
    ResolvedItem,
    ResolvedItemStat,
    ResolvedAttributeGroup,
    ResolvedModuleSlot,
    ResolvedItemType,
} from './resolution/resolve-item'

export * as NFT from './nft'
export {
    deserializeAsset,
    deserializeResource,
    deserializeComponent,
    deserializeModule,
    deserializeEntity,
    readCommonBase,
} from './nft/deserializers'
export type {
    NFTCargoItem,
    NFTModuleSlot,
    NFTInstalledModule,
    NFTCommonBase,
} from './nft/deserializers'

export {
    buildEntityDescription,
    formatModuleLine,
    entityDisplayName,
    moduleDisplayName,
    computeBaseHullmass,
    computeBaseCapacityShip,
    computeBaseCapacityWarehouse,
    computeEngineThrust,
    computeEngineDrain,
    computeGeneratorCap,
    computeGeneratorRech,
    computeExtractorRate,
    computeExtractorDrain,
    computeExtractorDepth,
    computeExtractorDrill,
    computeLoaderMass,
    computeLoaderThrust,
    computeCrafterSpeed,
    computeCrafterDrain,
} from './nft/description'

export {getEntitySlotLayout} from './data/recipes'
export {
    ITEM_TYPE_RESOURCE,
    ITEM_TYPE_COMPONENT,
    ITEM_TYPE_MODULE,
    ITEM_TYPE_ENTITY,
    itemTypeCode,
} from './data/tiers'
