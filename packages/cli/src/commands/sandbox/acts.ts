import {getStatCount} from '@shipload/sdk'
import {SandboxContract} from '@shipload/sdk/sandbox'
import {type Action, type APIClient, Name} from '@wharfkit/antelope'
import {InvalidArgumentError} from 'commander'
import {parseUint8, parseUint16} from '../../lib/args'
import {client, gameContractName} from '../../lib/client'
import {getAccountName} from '../../lib/session'
import {ValidationError} from '../../lib/validate'

export const DEFAULT_STAT = 500
export const MAX_STAT = 999
const MILLI_PER_ENERGY = 1000
const MAX_WHOLE_ENERGY = Math.floor(0xffffffff / MILLI_PER_ENERGY)

export interface ModuleSpec {
    slot: number
    itemId: number
    stats?: number[]
}

export function parseStats(s: string): number[] {
    const parts = s.split(',')
    return parts.map((part) => {
        const n = Number(part)
        if (part.trim() === '' || !Number.isInteger(n) || n < 0 || n > MAX_STAT) {
            throw new InvalidArgumentError(
                `stats must be comma-separated integers 0–${MAX_STAT} (got "${s}")`
            )
        }
        return n
    })
}

export function parseEnergy(s: string): number {
    const n = Number(s)
    if (!/^\d+$/.test(s) || n > MAX_WHOLE_ENERGY) {
        throw new InvalidArgumentError(
            `energy must be a whole number 0–${MAX_WHOLE_ENERGY} (got "${s}")`
        )
    }
    return n
}

export function parseModule(s: string): ModuleSpec {
    const parts = s.split(':')
    if (parts.length < 2 || parts.length > 3) {
        throw new InvalidArgumentError(
            `module must be "<slot>:<item-id>" or "<slot>:<item-id>:<stats>" (got "${s}")`
        )
    }
    const spec: ModuleSpec = {slot: parseUint8(parts[0]), itemId: parseUint16(parts[1])}
    if (parts.length === 3) spec.stats = parseStats(parts[2])
    return spec
}

export function accumulateModules(value: string, previous: ModuleSpec[] = []): ModuleSpec[] {
    return [...previous, parseModule(value)]
}

export function resolveStats(itemId: number, stats?: number[]): number[] {
    const count = getStatCount(itemId)
    if (!stats) return Array(count).fill(DEFAULT_STAT)
    if (stats.length !== count) {
        throw new ValidationError(
            `Item ${itemId} takes ${count} stat${count === 1 ? '' : 's'}, got ${stats.length}.`,
            count > 0 ? `--stats ${Array(count).fill(DEFAULT_STAT).join(',')}` : 'omit --stats'
        )
    }
    return stats
}

function moduleData(modules: ModuleSpec[]) {
    return modules.map((m) => ({
        slot: m.slot,
        item_id: m.itemId,
        stats: resolveStats(m.itemId, m.stats),
    }))
}

export interface ActsContext {
    contract: SandboxContract.Contract
    owner: string
}

export function sandboxContract(
    apiClient: APIClient = client,
    account: string = gameContractName
): SandboxContract.Contract {
    return new SandboxContract.Contract({client: apiClient, account: Name.from(account)})
}

export function defaultContext(): ActsContext {
    return {contract: sandboxContract(), owner: getAccountName()}
}

export interface SpawnArgs {
    itemId: number
    x: bigint
    y: bigint
    stats?: number[]
    modules?: ModuleSpec[]
    energy?: number
}

export function buildSpawn(ctx: ActsContext, args: SpawnArgs): Action {
    return ctx.contract.action('sbspawn', {
        owner: ctx.owner,
        item_id: args.itemId,
        stats: resolveStats(args.itemId, args.stats),
        modules: moduleData(args.modules ?? []),
        x: args.x,
        y: args.y,
        energy: args.energy === undefined ? undefined : args.energy * MILLI_PER_ENERGY,
    })
}

export interface GrantArgs {
    entityId: bigint
    itemId: number
    quantity: number
    stats?: number[]
    modules?: ModuleSpec[]
}

export function buildGrant(ctx: ActsContext, args: GrantArgs): Action {
    return ctx.contract.action('sbgrant', {
        owner: ctx.owner,
        entity_id: args.entityId,
        items: [
            {
                item_id: args.itemId,
                quantity: args.quantity,
                stats: resolveStats(args.itemId, args.stats),
                modules: moduleData(args.modules ?? []),
            },
        ],
    })
}

export function buildMove(ctx: ActsContext, entityId: bigint, x: bigint, y: bigint): Action {
    return ctx.contract.action('sbmove', {owner: ctx.owner, entity_id: entityId, x, y})
}

export function buildRemove(ctx: ActsContext, entityId: bigint): Action {
    return ctx.contract.action('sbremove', {owner: ctx.owner, entity_id: entityId})
}

export function buildCredit(
    ctx: ActsContext,
    x: bigint,
    y: bigint,
    amount: bigint,
    node?: number
): Action {
    return ctx.contract.action('sbcredit', {owner: ctx.owner, x, y, amount, node})
}

export function buildResolve(ctx: ActsContext, entityId: bigint, count?: bigint): Action {
    return ctx.contract.action('sbresolve', {owner: ctx.owner, entity_id: entityId, count})
}
