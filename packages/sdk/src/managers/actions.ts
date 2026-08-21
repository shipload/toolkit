import {
    Action,
    Asset,
    type AssetType,
    Bytes,
    Checksum256,
    type Checksum256Type,
    ExtendedAsset,
    Int64,
    type Int64Type,
    Name,
    type NameType,
    UInt8,
    type UInt8Type,
    UInt16,
    type UInt16Type,
    UInt32,
    type UInt32Type,
    UInt64,
    type UInt64Type,
} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Coordinates, PRECISION, type ClusterSlotType, type CoordinatesType} from '../types'
import {ServerContract, TokenContract} from '../contracts'
import {ATOMICASSETS_ABI, SHIPLOAD_COLLECTION} from '../nft/atomicassets'
import {getItem} from '../data/catalog'

const CHARGE_K = 1n
const ENERGY_DIVISOR = 1_000_000n
const UINT32_MAX = 4_294_967_295
const UINT32_MAX_BIGINT = 4_294_967_295n
const UINT32_MOD = 4_294_967_296n
const UINT64_MAX = 18_446_744_073_709_551_615n
const PRECISION_BIGINT = BigInt(PRECISION)

export type LaunchNumericInput =
    | number
    | bigint
    | string
    | {toNumber(): number}
    | {toString(): string}

export interface LaunchStatsInput {
    charge_rate?: LaunchNumericInput
    chargeRate?: LaunchNumericInput
    velocity: LaunchNumericInput
    drain: LaunchNumericInput
}

export interface LaunchQuoteLauncher {
    coordinates: CoordinatesType
    launcher: LaunchStatsInput
    generator?: {capacity: LaunchNumericInput}
}

export interface LaunchQuoteCatcher {
    coordinates: CoordinatesType
}

export interface LaunchQuote {
    chargeTime: number
    flightTime: number
    arrival: Date
    energyCost: number
    maxReach: bigint
}

function toNumber(value: LaunchNumericInput): number {
    if (typeof value === 'number') return Math.trunc(value)
    if (typeof value === 'bigint') return Number(value)
    if (typeof value === 'string') return Number(value)
    if ('toNumber' in value && typeof value.toNumber === 'function') return value.toNumber()
    return Number(value.toString())
}

function requiredNumber(value: LaunchNumericInput | undefined, label: string): number {
    if (value === undefined) throw new Error(`launch quote requires ${label}`)
    return toNumber(value)
}

function toBigInt(value: LaunchNumericInput | undefined): bigint {
    if (value === undefined) return 0n
    if (typeof value === 'bigint') return value
    if (typeof value === 'number') return BigInt(Math.trunc(value))
    if (typeof value === 'string') return BigInt(value)
    return BigInt(value.toString())
}

function saturatingMul(lhs: bigint, rhs: bigint): bigint {
    if (lhs !== 0n && rhs > UINT64_MAX / lhs) {
        return UINT64_MAX
    }
    return lhs * rhs
}

function clampLaunchResult(value: bigint): number {
    if (value < 1n) return 1
    if (value > UINT32_MAX_BIGINT) return UINT32_MAX
    return Number(value)
}

function toUint32(value: bigint): bigint {
    return value % UINT32_MOD
}

function calcDistance(origin: CoordinatesType, destination: CoordinatesType): bigint {
    const a = Coordinates.from(origin)
    const b = Coordinates.from(destination)
    const dx = toNumber(a.x) - toNumber(b.x)
    const dy = toNumber(a.y) - toNumber(b.y)
    return BigInt(Math.trunc(Math.sqrt(dx * dx + dy * dy) * PRECISION))
}

function calcCargoItemMassUint32(item: ServerContract.ActionParams.Type.cargo_item): bigint {
    let mass = toUint32(BigInt(getItem(item.item_id).mass) * toUint32(toBigInt(item.quantity)))

    for (const mod of item.modules) {
        if (mod.installed) {
            mass = toUint32(mass + BigInt(getItem(mod.installed.item_id).mass))
        }
    }

    return mass
}

function calcPayloadMass(items: ServerContract.ActionParams.Type.cargo_item[]): bigint {
    let mass = 0n
    for (const item of items) {
        mass = toUint32(mass + calcCargoItemMassUint32(item))
    }
    return mass
}

function calcChargeTime(chargeRate: number, mass: bigint): number {
    const rate = BigInt(chargeRate || 1)
    return clampLaunchResult((mass * CHARGE_K) / rate)
}

function calcFlightTime(velocity: number, distance: bigint): number {
    const v = BigInt(velocity || 1)
    return clampLaunchResult(distance / (v * PRECISION_BIGINT))
}

function calcLaunchEnergy(drain: number, mass: bigint, distance: bigint): number {
    const e =
        saturatingMul(saturatingMul(mass, distance / PRECISION_BIGINT), BigInt(drain)) /
        ENERGY_DIVISOR
    return clampLaunchResult(e)
}

function calcMaxReach(energyBudget: bigint, mass: bigint, drain: number): bigint {
    if (energyBudget < 1n) return 0n
    if (energyBudget >= UINT32_MAX_BIGINT || mass === 0n || drain === 0) return UINT64_MAX

    const numerator = (energyBudget + 1n) * ENERGY_DIVISOR - 1n
    const denominator = mass * BigInt(drain)
    const distanceUnits = numerator / denominator
    const maxDistance = distanceUnits * PRECISION_BIGINT + (PRECISION_BIGINT - 1n)
    return maxDistance > UINT64_MAX ? UINT64_MAX : maxDistance
}

export type EntityRefInput = {
    entityType: NameType
    entityId: UInt64Type
}

export type WaypointInput = {x: Int64Type; y: Int64Type}

export class ActionsManager extends BaseManager {
    private tokenContracts = new Map<string, TokenContract.Contract>()

    travel(shipId: UInt64Type, destination: CoordinatesType, recharge = true): Action {
        const x = Int64.from(destination.x)
        const y = Int64.from(destination.y)

        return this.server.action('travel', {
            id: UInt64.from(shipId),
            x,
            y,
            recharge,
        })
    }

    private entityRefs(entities: EntityRefInput[]) {
        return entities.map((e) =>
            ServerContract.Types.entity_ref.from({
                entity_type: e.entityType,
                entity_id: UInt64.from(e.entityId),
            })
        )
    }

    grouptravel(entities: EntityRefInput[], destination: CoordinatesType, recharge = true): Action {
        const entityRefs = this.entityRefs(entities)
        const x = Int64.from(destination.x)
        const y = Int64.from(destination.y)

        return this.server.action('grouptravel', {
            entities: entityRefs,
            x,
            y,
            recharge,
        })
    }

    travelplan(entities: EntityRefInput[], waypoints: WaypointInput[], recharge = true): Action {
        const entityRefs = this.entityRefs(entities)
        const wps = waypoints.map((w) =>
            ServerContract.Types.route_waypoint.from({x: Int64.from(w.x), y: Int64.from(w.y)})
        )
        return this.server.action('travelplan', {
            entities: entityRefs,
            waypoints: wps,
            recharge,
        })
    }

    transit(shipId: UInt64Type, entrance: CoordinatesType, exit: CoordinatesType): Action {
        return this.server.action('transit', {
            id: UInt64.from(shipId),
            ax: Int64.from(entrance.x),
            ay: Int64.from(entrance.y),
            bx: Int64.from(exit.x),
            by: Int64.from(exit.y),
        })
    }

    grouptransit(
        entities: EntityRefInput[],
        entrance: CoordinatesType,
        exit: CoordinatesType
    ): Action {
        const entityRefs = this.entityRefs(entities)
        return this.server.action('grouptransit', {
            entities: entityRefs,
            ax: Int64.from(entrance.x),
            ay: Int64.from(entrance.y),
            bx: Int64.from(exit.x),
            by: Int64.from(exit.y),
        })
    }

    getwormhole(x: Int64Type, y: Int64Type): Action {
        return this.server.action('getwormhole', {x: Int64.from(x), y: Int64.from(y)})
    }

    getdistance(origin: CoordinatesType, destination: CoordinatesType): Action {
        return this.server.action('getdistance', {
            ax: Int64.from(origin.x),
            ay: Int64.from(origin.y),
            bx: Int64.from(destination.x),
            by: Int64.from(destination.y),
        })
    }

    resolve(entityId: UInt64Type, count?: UInt64Type): Action {
        const params: ServerContract.ActionParams.resolve = {
            id: UInt64.from(entityId),
        }
        if (count !== undefined) {
            params.count = UInt64.from(count)
        }
        return this.server.action('resolve', params)
    }

    resolveall(owner: NameType): Action {
        return this.server.action('resolveall', {
            owner: Name.from(owner),
        })
    }

    cancel(entityId: UInt64Type, laneKey: number, count: UInt64Type): Action {
        return this.server.action('cancel', {
            id: UInt64.from(entityId),
            lane_key: UInt8.from(laneKey),
            count: UInt64.from(count),
        })
    }

    recharge(entityId: UInt64Type): Action {
        return this.server.action('recharge', {
            id: UInt64.from(entityId),
        })
    }

    rename(entityId: UInt64Type, name: string): Action {
        return this.server.action('rename', {
            id: UInt64.from(entityId),
            name,
        })
    }

    refrshentity(entityId: UInt64Type): Action {
        return this.server.action('refrshentity', {
            entity_id: UInt64.from(entityId),
        })
    }

    load(
        id: UInt64Type,
        fromId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('load', {
            id: UInt64.from(id),
            from_id: UInt64.from(fromId),
            items,
        })
    }

    unload(
        id: UInt64Type,
        toId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('unload', {
            id: UInt64.from(id),
            to_id: UInt64.from(toId),
            items,
        })
    }

    depotstore(
        shipId: UInt64Type,
        depotId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('depotstore', {
            ship_id: UInt64.from(shipId),
            depot_id: UInt64.from(depotId),
            items,
        })
    }

    depottake(
        shipId: UInt64Type,
        depotId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('depottake', {
            ship_id: UInt64.from(shipId),
            depot_id: UInt64.from(depotId),
            items,
        })
    }

    shuttle(
        carrierId: UInt64Type,
        fromId: UInt64Type,
        toId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('shuttle', {
            carrier: UInt64.from(carrierId),
            from_id: UInt64.from(fromId),
            to_id: UInt64.from(toId),
            items,
        })
    }

    launch(
        launcherId: UInt64Type,
        catcherId: UInt64Type,
        items: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.server.action('launch', {
            launcher_id: UInt64.from(launcherId),
            catcher_id: UInt64.from(catcherId),
            items,
        })
    }

    getLaunchQuote(
        launcher: LaunchQuoteLauncher,
        catcher: LaunchQuoteCatcher,
        items: ServerContract.ActionParams.Type.cargo_item[],
        start = new Date()
    ): LaunchQuote {
        const chargeRate = requiredNumber(
            launcher.launcher.charge_rate ?? launcher.launcher.chargeRate,
            'launcher charge rate'
        )
        const velocity = requiredNumber(launcher.launcher.velocity, 'launcher velocity')
        const drain = requiredNumber(launcher.launcher.drain, 'launcher drain')
        const mass = calcPayloadMass(items)
        const distance = calcDistance(launcher.coordinates, catcher.coordinates)
        const chargeTime = calcChargeTime(chargeRate, mass)
        const flightTime = calcFlightTime(velocity, distance)
        const energyCost = calcLaunchEnergy(drain, mass, distance)
        const maxReach = calcMaxReach(toBigInt(launcher.generator?.capacity), mass, drain)

        return {
            chargeTime,
            flightTime,
            arrival: new Date(start.getTime() + (chargeTime + flightTime) * 1000),
            energyCost,
            maxReach,
        }
    }

    foundCompany(account: NameType, name: string): Action {
        return this.platform.action('foundcompany', {
            account: Name.from(account),
            name,
        })
    }

    join(account: NameType): Action {
        return this.server.action('join', {
            account: Name.from(account),
        })
    }

    gather(
        sourceId: UInt64Type,
        destinationId: UInt64Type,
        stratum: UInt16Type,
        quantity: UInt32Type,
        slot?: UInt8Type
    ): Action {
        const params: ServerContract.ActionParams.gather = {
            source_id: UInt64.from(sourceId),
            destination_id: UInt64.from(destinationId),
            stratum: UInt16.from(stratum),
            quantity: UInt32.from(quantity),
        }
        if (slot !== undefined) {
            params.slot = UInt8.from(slot)
        }
        return this.server.action('gather', params)
    }

    gatherplan(
        sourceId: UInt64Type,
        destinationId: UInt64Type,
        stratum: UInt16Type,
        quantity: UInt32Type,
        recharge = true,
        slots: number[] = []
    ): Action {
        return this.server.action('gatherplan', {
            source_id: UInt64.from(sourceId),
            destination_id: UInt64.from(destinationId),
            stratum: UInt16.from(stratum),
            quantity: UInt32.from(quantity),
            recharge,
            slots: Bytes.from(slots),
        })
    }

    warp(entityId: UInt64Type, destination: CoordinatesType): Action {
        const x = Int64.from(destination.x)
        const y = Int64.from(destination.y)

        return this.server.action('warp', {
            id: UInt64.from(entityId),
            x,
            y,
        })
    }

    craft(
        entityId: UInt64Type,
        recipeId: number,
        quantity: number,
        inputs: ServerContract.ActionParams.Type.cargo_item[],
        target?: UInt64Type,
        slot?: UInt8Type
    ): Action {
        const params: ServerContract.ActionParams.craft = {
            id: UInt64.from(entityId),
            recipe_id: UInt16.from(recipeId),
            quantity: UInt32.from(quantity),
            inputs,
        }
        if (target !== undefined) {
            params.target = UInt64.from(target)
        }
        if (slot !== undefined) {
            params.slot = UInt8.from(slot)
        }
        return this.server.action('craft', params)
    }

    craftjob(
        shipId: UInt64Type,
        workshopId: UInt64Type,
        slot: UInt8Type,
        recipeId: UInt16Type,
        quantity: UInt32Type,
        inputs: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        const params: ServerContract.ActionParams.craftjob = {
            ship_id: UInt64.from(shipId),
            workshop_id: UInt64.from(workshopId),
            slot: UInt8.from(slot),
            recipe_id: UInt16.from(recipeId),
            quantity: UInt32.from(quantity),
            inputs,
        }
        return this.server.action('craftjob', params)
    }

    clustercraft(
        entityId: UInt64Type,
        recipeId: number,
        quantity: number,
        sources: ServerContract.ActionParams.Type.cluster_source[],
        target?: UInt64Type,
        slot?: UInt8Type
    ): Action {
        const params: ServerContract.ActionParams.clustercraft = {
            id: UInt64.from(entityId),
            recipe_id: UInt16.from(recipeId),
            quantity: UInt32.from(quantity),
            sources,
        }
        if (target !== undefined) {
            params.target = UInt64.from(target)
        }
        if (slot !== undefined) {
            params.slot = UInt8.from(slot)
        }
        return this.server.action('clustercraft', params)
    }

    claimjob(jobId: UInt64Type, shipId: UInt64Type): Action {
        const params: ServerContract.ActionParams.claimjob = {
            job_id: UInt64.from(jobId),
            ship_id: UInt64.from(shipId),
        }
        return this.server.action('claimjob', params)
    }

    canceljob(jobId: UInt64Type, shipId: UInt64Type): Action {
        const params: ServerContract.ActionParams.canceljob = {
            job_id: UInt64.from(jobId),
            ship_id: UInt64.from(shipId),
        }
        return this.server.action('canceljob', params)
    }

    upgradejob(
        targetId: UInt64Type,
        dockId: UInt64Type,
        targetItemId: UInt16Type,
        inputs: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        const params: ServerContract.ActionParams.upgradejob = {
            target_id: UInt64.from(targetId),
            dock_id: UInt64.from(dockId),
            target_item_id: UInt16.from(targetItemId),
            inputs,
        }
        return this.server.action('upgradejob', params)
    }

    claimupgrade(jobId: UInt64Type): Action {
        const params: ServerContract.ActionParams.claimupgrade = {
            job_id: UInt64.from(jobId),
        }
        return this.server.action('claimupgrade', params)
    }

    cancelupgrade(jobId: UInt64Type): Action {
        const params: ServerContract.ActionParams.cancelupgrade = {
            job_id: UInt64.from(jobId),
        }
        return this.server.action('cancelupgrade', params)
    }

    setsocket(workshopId: UInt64Type, slot: UInt8Type, open: boolean): Action {
        const params: ServerContract.ActionParams.setsocket = {
            workshop_id: UInt64.from(workshopId),
            slot: UInt8.from(slot),
            open,
        }
        return this.server.action('setsocket', params)
    }

    blend(entityId: UInt64Type, inputs: ServerContract.ActionParams.Type.cargo_item[]): Action {
        return this.server.action('blend', {
            id: UInt64.from(entityId),
            inputs,
        })
    }

    deploy(
        entityId: UInt64Type,
        ref: ServerContract.ActionParams.Type.cargo_ref,
        slot?: ClusterSlotType
    ): Action {
        return this.server.action('deploy', {
            id: UInt64.from(entityId),
            ref,
            slot: slot ? {hub: UInt64.from(slot.hub), gx: slot.gx, gy: slot.gy} : undefined,
        })
    }

    upgrade(
        builderId: UInt64Type,
        targetId: UInt64Type,
        targetItemId: UInt16Type,
        inputs: ServerContract.ActionParams.Type.cargo_item[],
        slot?: UInt8Type
    ): Action {
        const params: ServerContract.ActionParams.upgrade = {
            builder_id: UInt64.from(builderId),
            target_id: UInt64.from(targetId),
            target_item_id: UInt16.from(targetItemId),
            inputs,
        }
        if (slot !== undefined) {
            params.slot = UInt8.from(slot)
        }
        return this.server.action('upgrade', params)
    }

    claimplot(entityId: UInt64Type, targetItemId: UInt16Type, slot: ClusterSlotType): Action {
        return this.server.action('claimplot', {
            builder_id: UInt64.from(entityId),
            target_item_id: UInt16.from(targetItemId),
            slot: {hub: UInt64.from(slot.hub), gx: slot.gx, gy: slot.gy},
        })
    }

    movetile(
        hubId: UInt64Type,
        fromGx: number,
        fromGy: number,
        toGx: number,
        toGy: number
    ): Action {
        return this.server.action('movetile', {
            hub_id: UInt64.from(hubId),
            from_gx: fromGx,
            from_gy: fromGy,
            to_gx: toGx,
            to_gy: toGy,
        })
    }

    swaptile(hubId: UInt64Type, aGx: number, aGy: number, bGx: number, bGy: number): Action {
        return this.server.action('swaptile', {
            hub_id: UInt64.from(hubId),
            a_gx: aGx,
            a_gy: aGy,
            b_gx: bGx,
            b_gy: bGy,
        })
    }

    buildplot(entityId: UInt64Type, plotId: UInt64Type): Action {
        return this.server.action('buildplot', {
            builder_id: UInt64.from(entityId),
            plot_id: UInt64.from(plotId),
        })
    }

    abandonplot(plotId: UInt64Type): Action {
        return this.server.action('abandonplot', {
            plot_id: UInt64.from(plotId),
        })
    }

    addmodule(
        entityId: UInt64Type,
        moduleIndex: number,
        moduleRef: ServerContract.ActionParams.Type.cargo_ref,
        targetRef: ServerContract.ActionParams.Type.cargo_ref | null = null
    ): Action {
        return this.server.action('addmodule', {
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            module_ref: moduleRef,
            target_ref: targetRef ?? undefined,
        })
    }

    rmmodule(
        entityId: UInt64Type,
        moduleIndex: number,
        targetRef: ServerContract.ActionParams.Type.cargo_ref | null = null
    ): Action {
        return this.server.action('rmmodule', {
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            target_ref: targetRef ?? undefined,
        })
    }

    swapmodule(
        entityId: UInt64Type,
        moduleIndex: number,
        moduleRef: ServerContract.ActionParams.Type.cargo_ref
    ): Action {
        return this.server.action('swapmodule', {
            entity_id: UInt64.from(entityId),
            module_index: moduleIndex,
            module_ref: moduleRef,
        })
    }

    open(owner: NameType, tokenContract: NameType, tokenSymbol: Asset.SymbolType): Action {
        return this.platform.action('open', {
            owner: Name.from(owner),
            token_contract: Name.from(tokenContract),
            token_symbol: Asset.Symbol.from(tokenSymbol),
        })
    }

    close(owner: NameType, tokenContract: NameType, tokenSymbol: Asset.SymbolType): Action {
        return this.platform.action('close', {
            owner: Name.from(owner),
            token_contract: Name.from(tokenContract),
            token_symbol: Asset.Symbol.from(tokenSymbol),
        })
    }

    withdraw(
        owner: NameType,
        quantity: AssetType,
        tokenContract: NameType,
        memo = 'withdraw'
    ): Action {
        return this.platform.action('withdraw', {
            owner: Name.from(owner),
            quantity: ExtendedAsset.from({
                quantity: Asset.from(quantity),
                contract: Name.from(tokenContract),
            }),
            memo,
        })
    }

    tokenContract(account: NameType): TokenContract.Contract {
        const name = Name.from(account)
        const key = String(name)
        let contract = this.tokenContracts.get(key)
        if (!contract) {
            contract = new TokenContract.Contract({client: this.client, account: name})
            this.tokenContracts.set(key, contract)
        }
        return contract
    }

    tokenTransfer(
        from: NameType,
        to: NameType,
        quantity: AssetType,
        tokenContract: NameType,
        memo = ''
    ): Action {
        return this.tokenContract(tokenContract).action('transfer', {
            from: Name.from(from),
            to: Name.from(to),
            quantity: Asset.from(quantity),
            memo,
        })
    }

    // `open` is an idempotent no-op; omitting it is what produces the "call open first" abort.
    deposit(
        owner: NameType,
        quantity: AssetType,
        tokenContract: NameType,
        opts: {memo?: string; open?: boolean} = {}
    ): Action[] {
        const amount = Asset.from(quantity)
        const actions: Action[] = []
        if (opts.open !== false) {
            actions.push(this.open(owner, tokenContract, amount.symbol))
        }
        actions.push(
            this.tokenTransfer(
                owner,
                this.platform.account,
                amount,
                tokenContract,
                opts.memo ?? 'deposit'
            )
        )
        return actions
    }

    async wrap(
        owner: NameType,
        entityId: UInt64Type,
        nexusId: UInt64Type,
        cargoId: UInt64Type,
        quantity: UInt64Type,
        opts: {claimRam?: boolean} = {}
    ): Promise<Action[]> {
        const actions: Action[] = [
            this.platform.action('wrapcargo', {
                game: this.server.account,
                owner: Name.from(owner),
                entity_id: UInt64.from(entityId),
                nexus_id: UInt64.from(nexusId),
                cargo_id: UInt64.from(cargoId),
                quantity: UInt64.from(quantity),
            }),
        ]
        // setlastpayer is what fires logrampayer and clears the wrap gate; skipping it strands it.
        const claimRam = opts.claimRam ?? true
        if (claimRam) {
            actions.push(this.setLastPayer(owner, SHIPLOAD_COLLECTION))
        }
        return actions
    }

    undeploy(hostId: UInt64Type, targetId: UInt64Type): Action {
        return this.server.action('undeploy', {
            host_id: UInt64.from(hostId),
            target_id: UInt64.from(targetId),
        })
    }

    claimStarter(owner: NameType): Action {
        return this.server.action('claimstarter', {
            owner: Name.from(owner),
        })
    }

    async wrapEntity(
        owner: NameType,
        entityId: UInt64Type,
        nexusId: UInt64Type,
        opts: {claimRam?: boolean} = {}
    ): Promise<Action[]> {
        const actions: Action[] = [
            this.platform.action('wrapentity', {
                game: this.server.account,
                owner: Name.from(owner),
                entity_id: UInt64.from(entityId),
                nexus_id: UInt64.from(nexusId),
            }),
        ]
        // setlastpayer is what fires logrampayer and clears the wrap gate; skipping it strands it.
        const claimRam = opts.claimRam ?? true
        if (claimRam) {
            actions.push(this.setLastPayer(owner, SHIPLOAD_COLLECTION))
        }
        return actions
    }

    placecargo(owner: NameType, hostId: UInt64Type, assetId: UInt64Type): Action {
        return this.server.action('placecargo', {
            owner: Name.from(owner),
            host_id: UInt64.from(hostId),
            asset_id: UInt64.from(assetId),
        })
    }

    placeentity(owner: NameType, assetId: UInt64Type, targetNexusId: UInt64Type): Action {
        return this.server.action('placeentity', {
            owner: Name.from(owner),
            asset_id: UInt64.from(assetId),
            target_nexus_id: UInt64.from(targetNexusId),
        })
    }

    transferForUnwrap(owner: NameType, assetId: UInt64Type): Action {
        return Action.from(
            {
                account: this.atomicAssetsAccount,
                name: 'transfer',
                authorization: [{actor: Name.from(owner), permission: 'active'}],
                data: {
                    from: Name.from(owner),
                    to: this.platform.account,
                    asset_ids: [UInt64.from(assetId)],
                    memo: 'unwrap',
                },
            },
            ATOMICASSETS_ABI
        )
    }

    sendAsset(owner: NameType, recipient: NameType, assetId: UInt64Type, memo = ''): Action {
        return Action.from(
            {
                account: this.atomicAssetsAccount,
                name: 'transfer',
                authorization: [{actor: Name.from(owner), permission: 'active'}],
                data: {
                    from: Name.from(owner),
                    to: Name.from(recipient),
                    asset_ids: [UInt64.from(assetId)],
                    memo,
                },
            },
            ATOMICASSETS_ABI
        )
    }

    // Two top-level actions the wallet signs to unwrap an NFT into a host's cargo.
    unwrapCargoTx(owner: NameType, assetId: UInt64Type, hostId: UInt64Type): Action[] {
        return [this.transferForUnwrap(owner, assetId), this.placecargo(owner, hostId, assetId)]
    }

    // Two top-level actions the wallet signs to place an entity NFT at a nexus.
    unwrapEntityTx(owner: NameType, assetId: UInt64Type, targetNexusId: UInt64Type): Action[] {
        return [
            this.transferForUnwrap(owner, assetId),
            this.placeentity(owner, assetId, targetNexusId),
        ]
    }

    setRamPayer(newPayer: NameType, assetId: UInt64Type): Action {
        return Action.from(
            {
                account: this.atomicAssetsAccount,
                name: 'setrampayer',
                authorization: [{actor: Name.from(newPayer), permission: 'active'}],
                data: {new_payer: Name.from(newPayer), asset_id: UInt64.from(assetId)},
            },
            ATOMICASSETS_ABI
        )
    }

    setLastPayer(owner: NameType, collectionName: NameType): Action {
        return Action.from(
            {
                account: this.atomicAssetsAccount,
                name: 'setlastpayer',
                authorization: [{actor: Name.from(owner), permission: 'active'}],
                data: {owner: Name.from(owner), collection_name: Name.from(collectionName)},
            },
            ATOMICASSETS_ABI
        )
    }

    demolish(entityId: UInt64Type): Action {
        return this.server.action('demolish', {
            entity_id: UInt64.from(entityId),
        })
    }

    joinGame(account: NameType, companyName: string): Action[] {
        return [this.foundCompany(account, companyName), this.join(account)]
    }

    commit(oracleId: NameType, epoch: UInt64Type, commit: Checksum256Type): Action {
        return this.server.action('commit', {
            oracle_id: Name.from(oracleId),
            epoch: UInt64.from(epoch),
            commit: Checksum256.from(commit),
        })
    }

    reveal(oracleId: NameType, epoch: UInt64Type, reveal: Checksum256Type): Action {
        return this.server.action('reveal', {
            oracle_id: Name.from(oracleId),
            epoch: UInt64.from(epoch),
            reveal: Checksum256.from(reveal),
        })
    }

    addoracle(oracleId: NameType): Action {
        return this.server.action('addoracle', {
            oracle_id: Name.from(oracleId),
        })
    }

    removeoracle(oracleId: NameType): Action {
        return this.server.action('removeoracle', {
            oracle_id: Name.from(oracleId),
        })
    }

    setthreshold(threshold: UInt8Type): Action {
        return this.server.action('setthreshold', {
            threshold: UInt8.from(threshold),
        })
    }

    cleanrsvp(epoch: UInt64Type, maxRows: UInt64Type): Action {
        return this.server.action('cleanrsvp', {
            epoch: UInt64.from(epoch),
            max_rows: UInt64.from(maxRows),
        })
    }

    found(player: NameType, entityId: UInt64Type, location: CoordinatesType): Action {
        return this.server.action('found', {
            player: Name.from(player),
            entity_id: UInt64.from(entityId),
            x: Int64.from(location.x),
            y: Int64.from(location.y),
        })
    }

    naturalize(player: NameType, location: CoordinatesType): Action {
        return this.server.action('naturalize', {
            player: Name.from(player),
            x: Int64.from(location.x),
            y: Int64.from(location.y),
        })
    }

    contribute(
        player: NameType,
        entityId: UInt64Type,
        location: CoordinatesType,
        bundle: ServerContract.ActionParams.Type.cargo_item[]
    ): Action {
        return this.platform.action('contribute', {
            game: this.server.account,
            player: Name.from(player),
            entity_id: UInt64.from(entityId),
            x: Int64.from(location.x),
            y: Int64.from(location.y),
            bundle,
        })
    }

    // addcontrib asserts the citizenship rows exist, so naturalize must precede contribute.
    firstContribution(
        player: NameType,
        entityId: UInt64Type,
        location: CoordinatesType,
        bundle: ServerContract.ActionParams.Type.cargo_item[]
    ): Action[] {
        return [
            this.naturalize(player, location),
            this.contribute(player, entityId, location, bundle),
        ]
    }

    mintready(maxMints?: UInt32Type): Action {
        const params: {max_mints?: UInt32} = {}
        if (maxMints !== undefined) {
            params.max_mints = UInt32.from(maxMints)
        }
        return this.server.action('mintready', params)
    }

    charterready(location: CoordinatesType): Action {
        return this.server.action('charterready', {
            x: Int64.from(location.x),
            y: Int64.from(location.y),
        })
    }

    votecharter(player: NameType, location: CoordinatesType, nodeId: UInt32Type): Action {
        return this.server.action('votecharter', {
            player: Name.from(player),
            x: Int64.from(location.x),
            y: Int64.from(location.y),
            node_id: UInt32.from(nodeId),
        })
    }

    voteready(maxBallots: UInt32Type = UInt32.from(0)): Action {
        return this.server.action('voteready', {
            max_ballots: UInt32.from(maxBallots),
        })
    }
}
