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
import type {Entity as EntityType} from './entities/entity'

export {Shipload} from './shipload'
export {Entity} from './entities/entity'
export type Ship = EntityType
export type Warehouse = EntityType
export type Container = EntityType
export type Extractor = EntityType
export type Factory = EntityType
export type Nexus = EntityType
export {makeEntity} from './entities/makers'
export type {EntityStateInput, PackedModuleInput} from './entities/makers'
export type {InstalledModule} from './entities/slot-multiplier'

export type movement_stats = ServerContract.Types.movement_stats
export type energy_stats = ServerContract.Types.energy_stats
export type schedule = ServerContract.Types.schedule
export type lane = ServerContract.Types.lane
export type task = ServerContract.Types.task
export type coupling = ServerContract.Types.coupling
export type cargo_item = ServerContract.Types.cargo_item
export type entity_row = ServerContract.Types.entity_row

export type location_static = ServerContract.Types.location_static
export type location_derived = ServerContract.Types.location_derived
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
    ClusterManager,
    computeFreeCells,
    NftManager,
    ConstructionManager,
} from './managers'
export type {GridCell, ClusterCell, Cluster} from './managers'
export type {
    PlayerRosterEntry,
    LocationStratum,
    NftConfigForItem,
    BuildableTarget,
    BuildState,
    SourceEntityRef,
    SourceCargoStack,
    FinalizerEntityRef,
    FinalizerCapability,
    InboundTransfer,
    ScheduledBuild,
    Reservation,
} from './managers'
export type {
    EntityRefInput,
    LaunchNumericInput,
    LaunchQuote,
    LaunchQuoteCatcher,
    LaunchQuoteLauncher,
    LaunchStatsInput,
} from './managers/actions'
export type {WrapDeposit} from './managers/nft'
export {resolveLockedAmount} from './managers/nft'

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
} from './data/catalog'
export {getCurrentEpoch, getEpochInfo} from './scheduling/epoch'
export type {EpochInfo} from './scheduling/epoch'
export {
    getSystemName,
    hasSystem,
    getLocationKind,
    getLocationType,
    getLocationTypeName,
    isGatherableLocation,
    isLocationBuildable,
    deriveLocationStatic,
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
    yieldThresholdAt,
    YIELD_FRACTION_SHALLOW,
    YIELD_FRACTION_DEEP,
    PLANET_SUBTYPE_GAS_GIANT,
    PLANET_SUBTYPE_ROCKY,
    PLANET_SUBTYPE_TERRESTRIAL,
    PLANET_SUBTYPE_ICY,
    PLANET_SUBTYPE_OCEAN,
    PLANET_SUBTYPE_INDUSTRIAL,
} from './derivation'

export type {StratumInfo, ResourceStats, DerivedStratum} from './derivation'

export {
    RESERVE_TIERS,
    TIER_ROLL_MAX,
    tierOfReserve,
    rollTier,
    rollWithinTier,
    RESOURCE_TIER_MULT_TENTHS,
    applyResourceTierMultiplier,
} from './derivation'
export type {ReserveTier, TierRange} from './derivation'

export {getEffectiveReserve} from './derivation'
export type {EffectiveReserveInput} from './derivation'

export {eligibleUpgrades} from './derivation'

export {getStatDefinitions, getStatName, resolveStats} from './derivation'
export type {StatDefinition, NamedStats} from './derivation'

export {
    STAR_STEP,
    MAX_STARS_PER_STAT,
    MAX_STAR_RATING,
    starsForStat,
    starRating,
    statMagnitude,
    compareByStars,
} from './derivation'
export type {StarSortable} from './derivation'

export {hash, hash512} from './utils/hash'
export {validateDisplayName, normalizeDisplayName} from './utils/display-name'
export type {DisplayNameResult, ValidateDisplayNameOptions} from './utils/display-name'

export {
    distanceBetweenCoordinates,
    distanceBetweenPoints,
    findNearbyPlanets,
    calc_acceleration,
    calc_energyusage,
    calc_flighttime,
    calc_travel_flighttime,
    calc_group_flighttime,
    calc_loader_acceleration,
    calc_loader_flighttime,
    calc_onesided_duration,
    calc_orbital_altitude,
    calc_rechargetime,
    calc_ship_acceleration,
    calc_ship_flighttime,
    calc_ship_mass,
    calc_ship_rechargetime,
    calc_transfer_duration,
    calc_transit_duration,
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

export {planRoute, sdkSystemGraph, MAX_LEGS} from './travel/route-planner'
export type {
    Coord,
    Neighbor,
    SystemGraph,
    ScanProvider,
    RoutePlan,
    RouteFailure,
    RouteResult,
    RouteFailureReason,
    PlanRouteParams,
    RouteLegInput,
    RouteLegCost,
    RouteHeuristicCost,
} from './travel/route-planner'

export {computePerLegReach, computeGroupPerLegReach} from './travel/reach'
export type {ReachStats} from './travel/reach'

export {simulateRoute} from './travel/route-simulator'
export type {RouteMoverInput, RouteLegSim, RouteSim} from './travel/route-simulator'

export * as schedule from './scheduling/schedule'
export {LANE_MOBILITY, LANE_BARRIER} from './scheduling/schedule'
export type {
    ScheduleData,
    LaneView,
    OrderedTask,
    ResolvedEvent,
} from './scheduling/schedule'
export {
    candidateLaneCompletesAt,
    laneKeyForModule,
    rawScheduleEnd,
    resolveLaneGatherer,
    resolveLaneCrafter,
    resolveLaneBuilder,
    resolveLaneLoader,
    selectGatherLane,
    workerLaneKey,
} from './scheduling/lanes'
export type {
    ResolvedGathererLane,
    ResolvedCrafterLane,
    ResolvedLoaderLane,
} from './scheduling/lanes'
export {ScheduleAccessor, createScheduleAccessor} from './scheduling/accessor'
export {InventoryAccessor, createInventoryAccessor} from './entities/inventory-accessor'
export type {HasCargo} from './entities/inventory-accessor'

export * as cargoUtils from './entities/cargo-utils'
export type {CargoData} from './entities/cargo-utils'

export {cargoRef, cargoItem} from './utils/cargo'

export {
    createProjectedEntity,
    projectEntity,
    projectEntityAt,
    projectRemainingAt,
    validateSchedule,
} from './scheduling/projection'
export type {
    Projectable,
    ProjectedEntity,
    ProjectionOptions,
} from './scheduling/projection'

export {taskCargoChanges} from './scheduling/task-cargo'
export type {TaskCargoChange, TaskCargoDirection} from './scheduling/task-cargo'

export {jobsToLanes, pickFabricator, socketTail, JOB_QUEUE_CAP} from './scheduling/jobs'
export type {JobWindow, JobLane, JobLaneEntry} from './scheduling/jobs'

export {composeIdleResolve} from './scheduling/idle-resolve'
export type {CounterpartLookup, IdleResolveTarget} from './scheduling/idle-resolve'

export {cancelEligibility, CancelBlockReason} from './scheduling/cancel'
export type {
    CancelPlan,
    CancelEffects,
    CancelRefund,
    CancelReleasedHold,
    CancelEligibilityInput,
} from './scheduling/cancel'

export {
    derivedLoaders,
    estimateUnwrapDuration,
    incomingHoldMass,
    projectedPeakCargomass,
    receiveFits,
    unwrapLoadDuration,
    unwrapTransitDuration,
} from './scheduling/unwrap'
export type {DerivedLoaders, UnwrapDestination, UnwrapItem} from './scheduling/unwrap'

export {
    projectedCargoAvailableAt,
    availableForItem,
    cargoReadyAt,
    taskCargoEffect,
} from './scheduling/availability'

export {maxCraftable} from './capabilities/craftable'

export {energyAtTime} from './scheduling/energy'

export * from './types/capabilities'
export * from './types/entity'
export {
    EntityClass,
    ENTITY_SHIP,
    ENTITY_WAREHOUSE,
    ENTITY_EXTRACTOR,
    ENTITY_FACTORY,
    ENTITY_WORKSHOP,
    ENTITY_CONTAINER,
    ENTITY_NEXUS,
    ENTITY_HUB,
    getEntityClass,
    getPackedEntityType,
    getKindMeta,
    getTemplateMeta,
    kindCan,
    ALL_ENTITY_TYPES,
    CAP_WRAP,
    CAP_UNDEPLOY,
    CAP_DEMOLISH,
    CAP_MODULES,
    isShip,
    isWarehouse,
    isExtractor,
    isFactory,
    isWorkshop,
    isContainer,
    isNexus,
    isPlot,
    isHub,
} from './data/kind-registry'
export type {EntityTypeName, KindMeta, TemplateMeta} from './data/kind-registry'
export * from './capabilities'

export {
    categoryColors,
    tierColors,
    componentIcon,
    moduleIcon,
    itemAbbreviations,
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
    isInvertedAttribute,
    getCapabilityAttributes,
} from './data/capabilities'
export type {CapabilityAttribute, StatMapping, CapabilityAttributeRow} from './data/capabilities'

export {
    deriveStatMappings,
    getStatMappings,
    getStatMappingsForStat,
    getStatMappingsForCapability,
    getProducersForAttribute,
    getCapabilityAttributeRows,
    sourceLabelForOutput,
} from './derivation/capability-mappings'
export {SLOT_FORMULAS} from './data/capability-formulas'
export type {SlotConsumer, SlotConsumerKind} from './data/capability-formulas'
export {
    getAllRecipes,
    getRecipeConsumers,
    getComponentDemand,
    getResourceDemand,
} from './derivation/recipe-usage'
export type {StatFlow, RecipeConsumer, DemandRow, ResourceDemand} from './derivation/recipe-usage'

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

export {
    availableBuildMethods,
    isBuildable,
    isPlotBuildable,
    filterByBuildMethod,
    allBuildableItems,
    allPlotBuildableItems,
} from './derivation/build-methods'
export type {BuildMethod} from './derivation/build-methods'

export {
    computeShipHullCapabilities,
    computeEngineCapabilities,
    computeGeneratorCapabilities,
    computeGathererCapabilities,
    computeHaulerCapabilities,
    computeLoaderCapabilities,
    computeCrafterCapabilities,
    computeBuilderCapabilities,
    computeWarehouseHullCapabilities,
    computeStorageCapabilities,
    computeBatteryCapabilities,
    computeContainerCapabilities,
    computeWarpCapabilities,
    computeLauncherCapabilities,
    computeBaseCapacity,
    computeEntityCapabilities,
    getBaseHullmassFor,
    DEFAULT_BASE_HULLMASS,
    CAPACITY_TIER_TABLE,
    capacityTierMultiplier,
    applyCapacityTier,
    GATHERER_DEPTH_TABLE,
    GATHERER_DEPTH_MAX_TIER,
    gathererDepthForTier,
} from './derivation/capabilities'
export type {
    GathererDepthParams,
    ComputedCapabilities,
    TravelDrainBreakdown,
} from './derivation/capabilities'

export {
    WH,
    feistel,
    feistelInv,
    regionOf,
    partnerRegion,
    nearbyWormholes,
    wormholeAt,
    wormholeAtRegionEndpoint,
    isValidWormholePair,
} from './derivation/wormhole'

export {rollupGatherer, rollupCrafter, rollupBuilder, rollupLoaders} from './derivation/rollups'

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

export {deserializeAtomicData} from './nft/atomicdata'
export type {SchemaField, RawData} from './nft/atomicdata'

export {
    buildImmutableData,
    buildResourceImmutable,
    buildComponentImmutable,
    buildModuleImmutable,
    buildEntityImmutable,
    computeNftImageUrl,
} from './nft/buildImmutableData'
export type {
    AtomicAttributeType,
    ImmutableEntry,
    ImmutableModuleSlot,
} from './nft/buildImmutableData'

export {
    fetchAtomicAssetsForOwner,
    fetchAtomicSchemas,
    decodeAtomicAsset,
    buildMintAssetAction,
    ATOMICASSETS_ACCOUNT,
    SHIPLOAD_COLLECTION,
} from './nft/atomicassets'
export {
    MODULE_STAT_SCALING_ANCHOR,
    MODULE_STAT_SCALING_POST_ANCHOR_PERCENT,
    computeEffectiveModuleStat,
} from './derivation/stat-scaling'
export type {
    AtomicAssetRow,
    AtomicSchemaRow,
    DecodedAtomicAsset,
    FetchAssetsOptions,
    MintAssetParams,
} from './nft/atomicassets'

export {
    buildEntityDescription,
    formatModuleLine,
    entityDisplayName,
    moduleDisplayName,
    computeBaseHullmass,
    computeBaseCapacityShip,
    computeBaseCapacityWarehouse,
    computeBaseCapacityContainer,
    computeEngineThrust,
    computeEngineDrain,
    computeTravelDrain,
    ENGINE_DRAIN_BASE,
    ENGINE_DRAIN_REF_THRUST,
    ENGINE_DRAIN_REF_THM,
    computeGeneratorCap,
    computeGeneratorRech,
    computeGathererYield,
    computeGathererDrain,
    computeGathererDepth,
    computeLoaderMass,
    computeLoaderThrust,
    computeCrafterSpeed,
    computeCrafterDrain,
    computeBuilderSpeed,
    computeBuilderDrain,
    computeHaulerCapacity,
    computeHaulerEfficiency,
    computeWarpRange,
} from './nft/description'

export {
    ITEM_TYPE_RESOURCE,
    ITEM_TYPE_COMPONENT,
    ITEM_TYPE_MODULE,
    ITEM_TYPE_ENTITY,
    itemTypeCode,
} from './data/tiers'

export {formatMass, formatMassDelta, formatMassScaled, formatLocation} from './format'
export * from './coordinates'

export {displayName, baseName, describeItem} from './resolution/display-name'
export type {DescribeOptions} from './resolution/display-name'

export * from './subscriptions'

export {
    allocateProportional,
    buildGatherPlan,
    gatherEnergyCost,
    maxQtyForCharge,
    planParallelTransfer,
    splitCost,
} from './planner'
export type {
    BuildGatherPlanOpts,
    FillCap,
    GatherCycle,
    GatherLimpet,
    GatherPlan,
    GatherPlanEntity,
    LanePlanEntry,
    PlanTarget,
} from './planner'
