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
export type mixture_info = ServerContract.Types.mixture_info
export type mixture_component = ServerContract.Types.mixture_component
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
    TradesManager,
    EpochsManager,
    ActionsManager,
} from './managers'
export type {EntityType} from './managers'
export type {EntityRefInput} from './managers/actions'

export {getGood, getGoods, goodIds} from './market/goods'
export {getCurrentEpoch, getEpochInfo} from './scheduling/epoch'
export type {EpochInfo} from './scheduling/epoch'
export {marketPrice, marketPrices, getRarity, Rarities} from './market/market'
export type {Rarity} from './market/market'
export {
    getSystemName,
    hasSystem,
    getLocationType,
    isExtractableLocation,
    deriveLocationStatic,
    deriveLocationEpoch,
    deriveLocation,
    deriveLocationMixture,
} from './utils/system'

export {hash, hash512} from './utils/hash'

export type {Deal, FindDealsOptions} from './trading/deal'
export {findDealsForShip, findBestDeal} from './trading/deal'

export type {
    CollectActionType,
    CollectOption,
    CollectAnalysis,
    CollectAnalysisOptions,
    CollectAnalysisCallbacks,
    BetterSaleLocation,
    RepositionLocation,
    DiscountedGoodInfo,
    PotentialDeal,
    CargoSaleItem,
} from './trading/collect'
export {
    analyzeCollectOptions,
    analyzeCargoSale,
    createSellAndTradeOption,
    createTravelToSellOption,
    createSellAndRepositionOption,
    createSellAndStayOption,
    createExploreOption,
} from './trading/collect'

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

export {
    calculateUpdatedCargoCost,
    calculateMaxTradeQuantity,
    calculateTradeProfit,
    calculateProfitPerMass,
    calculateProfitPerSecond,
    findBestGoodToTrade,
    calculateBreakEvenPrice,
    isProfitable,
    calculateROI,
} from './trading/trade'
export type {TradeCalculation, TradeProfitResult} from './trading/trade'

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
