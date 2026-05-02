export * from './contracts'
export * from './errors'
export * from './types'
export * from './data/item-ids'
export * from './data/recipes-runtime'

// Direct namespace re-exports for flat `Types` access without going through ServerContract.
// Preserves both value and type sides through rollup-plugin-dts bundling.
export {Types as ServerTypes} from './contracts/server'
export {Types as PlatformTypes} from './contracts/platform'

import type {ServerContract} from './contracts'

export {Shipload} from './shipload'
export {Ship} from './entities/ship'
export type {ShipStateInput, PackedModuleInput} from './entities/ship'
export {Warehouse, computeWarehouseCapabilities} from './entities/warehouse'
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
export type gatherer_stats = ServerContract.Types.gatherer_stats

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
export type {EntityType, LocationStratum} from './managers'
export type {EntityRefInput} from './managers/actions'

export {
    getItem,
    getItems,
    itemIds,
    getResources,
    getComponents,
    getModules,
    getEntityItems,
    resolveItemCategory,
    typeLabel,
    categoryLabel,
    categoryFromIndex,
    categoryLabelFromIndex,
    tierLabel,
} from './data/catalog'
export {getCurrentEpoch, getEpochInfo} from './scheduling/epoch'
export type {EpochInfo} from './scheduling/epoch'
export {
    getSystemName,
    hasSystem,
    getLocationType,
    getLocationTypeName,
    isGatherableLocation,
    deriveLocationStatic,
    deriveLocationEpoch,
    deriveLocation,
} from './utils/system'

export {
    deriveStratum,
    deriveStrata,
    deriveResourceStats,
    deriveLocationSize,
    getEligibleResources,
    getResourceWeight,
    getLocationCandidates,
    getLocationProfile,
    getDepthThreshold,
    getResourceTier,
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

export type {StratumInfo, ResourceStats, DerivedStratum} from './derivation'

export {RESERVE_TIERS, TIER_ROLL_MAX, rollTier, rollWithinTier} from './derivation'
export type {ReserveTier, TierRange} from './derivation'

export {getStatDefinitions, getStatName, resolveStats} from './derivation'
export type {StatDefinition, NamedStats} from './derivation'

export {hash, hash512} from './utils/hash'

export {
    distanceBetweenCoordinates,
    distanceBetweenPoints,
    findNearbyPlanets,
    calc_acceleration,
    calc_energyusage,
    calc_flighttime,
    calc_loader_acceleration,
    calc_loader_flighttime,
    calc_orbital_altitude,
    calc_rechargetime,
    calc_ship_acceleration,
    calc_ship_flighttime,
    calc_ship_mass,
    calc_ship_rechargetime,
    calc_transfer_duration,
    calculateFlightTime,
    calculateLoadTimeBreakdown,
    calculateRefuelingTime,
    calculateTransferTime,
    easeFlightProgress,
    estimateDealTravelTime,
    estimateTravelTime,
    flightSpeedFactor,
    type FloatPosition,
    getDestinationLocation,
    getFlightOrigin,
    getInterpolatedPosition,
    getPositionAt,
    hasEnergyForDistance,
    interpolateFlightPosition,
    lerp,
    rotation,
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

export {
    createProjectedEntity,
    projectEntity,
    projectEntityAt,
    projectFromCurrentState,
    projectFromCurrentStateAt,
    validateSchedule,
} from './scheduling/projection'
export type {
    Projectable,
    ProjectableSnapshot,
    ProjectedEntity,
    ProjectionOptions,
} from './scheduling/projection'

export * from './types/capabilities'
export * from './types/entity'
export * from './capabilities'

export {
    categoryColors,
    tierColors,
    tierLabels,
    categoryIcons,
    categoryIconShapes,
    componentIcon,
    moduleIcon,
    itemAbbreviations,
} from './data/colors'
export type {CategoryIconShape} from './data/colors'

export {itemTier, itemOffset, itemCategory, isRelatedItem, isCraftedItem} from './data/tiers'
export type {CraftedItemCategory} from './data/tiers'

export {getCategoryInfo} from './data/categories'
export type {CategoryInfo} from './data/categories'

export {getPlanetSubtypes, getPlanetSubtype} from './data/locations'
export type {PlanetSubtypeInfo} from './data/locations'

export {
    capabilityNames,
    capabilityAttributes,
    isInvertedAttribute,
    getCapabilityAttributes,
} from './data/capabilities'
export type {CapabilityAttribute, StatMapping} from './data/capabilities'

export {
    deriveStatMappings,
    getStatMappings,
    getStatMappingsForStat,
    getStatMappingsForCapability,
} from './derivation/capability-mappings'
export {SLOT_FORMULAS} from './data/capability-formulas'
export type {SlotConsumer, SlotConsumerKind} from './data/capability-formulas'

export {
    encodeStats,
    encodeGatheredCargoStats,
    decodeStat,
    decodeStats,
    decodeCraftedItemStats,
    blendStacks,
    computeComponentStats,
    blendComponentStacks,
    computeEntityStats,
    blendCargoStacks,
    blendCrossGroup,
    computeInputMass,
    computeCraftedOutputStats,
} from './derivation/crafting'
export type {StackInput, CategoryStacks, RecipeSlotInput} from './derivation/crafting'

export {computeContainerCapabilities, computeContainerT2Capabilities} from './entities/container'

export {
    computeShipHullCapabilities,
    computeEngineCapabilities,
    computeGeneratorCapabilities,
    computeGathererCapabilities,
    computeHaulerCapabilities,
    computeLoaderCapabilities,
    computeCrafterCapabilities,
    computeWarehouseHullCapabilities,
    computeStorageCapabilities,
    computeShipCapabilities,
    GATHERER_DEPTH_TABLE,
    GATHERER_DEPTH_MAX_TIER,
    gathererDepthForTier,
} from './entities/ship-deploy'
export type {ShipCapabilities, GathererDepthParams} from './entities/ship-deploy'

export {resolveItem} from './resolution/resolve-item'
export type {
    ResolvedItem,
    ResolvedItemStat,
    ResolvedAttributeGroup,
    ResolvedModuleSlot,
    ResolvedItemType,
} from './resolution/resolve-item'

export {
    describeModule,
    describeModuleForItem,
    describeModuleForSlot,
    renderDescription,
} from './resolution/describe-module'
export type {
    TextSpan,
    CapabilityInput,
    ModuleDescription,
    RenderDescriptionOptions,
} from './resolution/describe-module'

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
    computeGathererYield,
    computeGathererDrain,
    computeGathererDepth,
    computeGathererSpeed,
    computeLoaderMass,
    computeLoaderThrust,
    computeCrafterSpeed,
    computeCrafterDrain,
    computeWarpRange,
} from './nft/description'

export {
    ITEM_TYPE_RESOURCE,
    ITEM_TYPE_COMPONENT,
    ITEM_TYPE_MODULE,
    ITEM_TYPE_ENTITY,
    itemTypeCode,
} from './data/tiers'

export {formatMass, formatMassDelta} from './format'

export {displayName, describeItem} from './resolution/display-name'
export type {DescribeOptions} from './resolution/display-name'

export * from './subscriptions'
