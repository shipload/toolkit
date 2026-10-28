import {getItem} from '../data/catalog'
import {ENTITY_SHIP, getTemplateMeta} from '../data/kind-registry'
import {getRecipe, type Recipe} from '../data/recipes-runtime'
import {isPlotBuildable} from '../derivation/build-methods'
import {decodeStat, isMeanSource} from '../derivation/crafting'
import {getStatName, type StatDefinition} from '../derivation/stats'
import type {ResourceCategory} from '../types'

export type GoalStatTargets = Partial<Record<ResourceCategory, number>>

export interface Goal {
    itemId: number
    quantity: number
    ship?: string
    statTargets?: GoalStatTargets
}

export interface GoalCoordinates {
    x: number
    y: number
}

export type GoalStockPlace = 'hold' | 'depot' | 'workshop' | 'job'

export interface GoalStock {
    itemId: number
    quantity: number
    place: GoalStockPlace
    entityId?: string
    location?: GoalCoordinates
    stats?: bigint
}

export interface GoalEntity {
    id: string
    itemId: number
    location?: GoalCoordinates
    installed: number[]
}

export interface GoalHoldings {
    stock: GoalStock[]
    entities: GoalEntity[]
}

export type GoalCreditPlace = GoalStockPlace | 'installed' | 'entity'

export interface GoalCredit {
    place: GoalCreditPlace
    quantity: number
    entityId?: string
    location?: GoalCoordinates
}

export interface GoalNode {
    itemId: number
    needed: number
    credited: GoalCredit[]
    belowTarget: number
    shortfall: number
    inputs: number[]
}

export type GoalStepKind = 'gather' | 'book' | 'pickup' | 'claim-plot' | 'install'

export interface GoalStep {
    id: string
    kind: GoalStepKind
    itemId: number
    quantity: number
    dependsOn: string[]
    waiting?: boolean
    receiver?: 'plot'
}

export interface GoalHuntStat {
    resourceItemId: number
    statIndex: number
    stat: StatDefinition
}

export interface GoalHunt {
    category: ResourceCategory
    stats: GoalHuntStat[]
    target?: number
}

export interface GoalPlan {
    goal: Goal
    available: boolean
    finished: boolean
    nodes: GoalNode[]
    steps: GoalStep[]
    ready: GoalStep[]
    hunts: GoalHunt[]
}

const STOCK_ORDER: readonly GoalStockPlace[] = ['hold', 'depot', 'workshop', 'job']
const IN_HAND: readonly GoalStockPlace[] = ['hold', 'depot']

interface PoolLine extends GoalStock {
    left: number
    flagged: boolean
}

interface PoolModule {
    itemId: number
    used: boolean
}

interface PoolEntity {
    entity: GoalEntity
    used: boolean
    modules: PoolModule[]
}

interface Pool {
    lines: PoolLine[]
    entities: PoolEntity[]
}

interface StatGate {
    category: ResourceCategory
    statIndex: number
    target: number
}

interface Derivation {
    goal: Goal
    pool: Pool
    nodes: Map<number, GoalNode>
    carries: Map<number, Set<number>>
}

export function canSetGoal(itemId: number): boolean {
    return getRecipe(itemId) !== undefined
}

export function isShipItem(itemId: number): boolean {
    return getTemplateMeta(itemId)?.kind.equals(ENTITY_SHIP) ?? false
}

function liveSlot(recipe: Recipe): number {
    return recipe.statSlots.findIndex((slot) => slot.sources.some((s) => !isMeanSource(s)))
}

function resourceCarryIndex(component: Recipe): number | undefined {
    const slot = component.statSlots[liveSlot(component)]
    return slot?.sources.find((s) => !isMeanSource(s))?.statIndex
}

function statGate(goal: Goal, itemId: number, carryIndex?: number): StatGate | undefined {
    if (!goal.statTargets) return undefined
    const item = getItem(itemId)
    if (item.type === 'resource') {
        const category = item.category as ResourceCategory
        const target = goal.statTargets[category]
        if (target === undefined || carryIndex === undefined) return undefined
        return {category, statIndex: carryIndex, target}
    }
    if (item.type !== 'component') return undefined
    const recipe = getRecipe(itemId)
    if (!recipe) return undefined
    const category = getItem(recipe.inputs[0].itemId).category as ResourceCategory
    const target = goal.statTargets[category]
    if (target === undefined) return undefined
    return {category, statIndex: liveSlot(recipe), target}
}

function meetsGate(line: GoalStock, gate: StatGate | undefined): boolean {
    if (!gate || line.stats === undefined) return true
    return decodeStat(line.stats, gate.statIndex) >= gate.target
}

function buildPool(holdings: GoalHoldings): Pool {
    const lines = STOCK_ORDER.flatMap((place) =>
        holdings.stock
            .filter((s) => s.place === place && s.quantity > 0)
            .map((s) => ({...s, left: s.quantity, flagged: false}))
    )
    const entities = holdings.entities.map((entity) => ({
        entity,
        used: false,
        modules: entity.installed.map((itemId) => ({itemId, used: false})),
    }))
    return {lines, entities}
}

function hasGenerator(e: PoolEntity): boolean {
    return e.entity.installed.some((id) => getItem(id).moduleType === 'generator')
}

function canLift(pool: Pool, owner: PoolEntity, itemId: number): boolean {
    if (getItem(itemId).moduleType !== 'generator') return true
    return pool.entities.some((e) => e !== owner && hasGenerator(e))
}

function addCredit(node: GoalNode, credit: GoalCredit): void {
    const same = node.credited.find(
        (c) => c.place === credit.place && c.entityId === credit.entityId
    )
    if (same) same.quantity += credit.quantity
    else node.credited.push(credit)
}

function creditEntities(d: Derivation, node: GoalNode, want: number, only?: string): number {
    let left = want
    for (const e of d.pool.entities) {
        if (left <= 0) break
        if (e.used || e.entity.itemId !== node.itemId) continue
        if (only !== undefined && e.entity.id !== only) continue
        e.used = true
        left--
        addCredit(node, {
            place: 'entity',
            quantity: 1,
            entityId: e.entity.id,
            location: e.entity.location,
        })
    }
    return want - left
}

function creditInstalled(d: Derivation, node: GoalNode, want: number, only?: string): number {
    let left = want
    for (const e of d.pool.entities) {
        if (only !== undefined && e.entity.id !== only) continue
        for (const m of e.modules) {
            if (left <= 0) break
            if (m.used || m.itemId !== node.itemId) continue
            if (only === undefined && !canLift(d.pool, e, m.itemId)) continue
            m.used = true
            left--
            addCredit(node, {
                place: 'installed',
                quantity: 1,
                entityId: e.entity.id,
                location: e.entity.location,
            })
        }
    }
    return want - left
}

function creditStock(
    d: Derivation,
    node: GoalNode,
    want: number,
    places: readonly GoalStockPlace[],
    gate: StatGate | undefined
): number {
    let left = want
    for (const line of d.pool.lines) {
        if (left <= 0) break
        if (line.itemId !== node.itemId || line.left <= 0 || !places.includes(line.place)) {
            continue
        }
        if (!meetsGate(line, gate)) {
            if (!line.flagged) {
                line.flagged = true
                node.belowTarget += line.left
            }
            continue
        }
        const take = Math.min(left, line.left)
        line.left -= take
        left -= take
        addCredit(node, {
            place: line.place,
            quantity: take,
            entityId: line.entityId,
            location: line.location,
        })
    }
    return want - left
}

function nodeFor(d: Derivation, itemId: number): GoalNode {
    let node = d.nodes.get(itemId)
    if (!node) {
        node = {itemId, needed: 0, credited: [], belowTarget: 0, shortfall: 0, inputs: []}
        d.nodes.set(itemId, node)
    }
    return node
}

function expand(d: Derivation, node: GoalNode, units: number, ship?: string): void {
    node.shortfall += units
    const recipe = getRecipe(node.itemId)
    if (!recipe || units <= 0) return
    const carry = getItem(node.itemId).type === 'component' ? resourceCarryIndex(recipe) : undefined
    for (const input of recipe.inputs) {
        if (!node.inputs.includes(input.itemId)) node.inputs.push(input.itemId)
        const isEntity = getItem(input.itemId).type === 'entity'
        need(d, input.itemId, input.quantity * units, carry, isEntity ? ship : undefined)
    }
}

function need(
    d: Derivation,
    itemId: number,
    quantity: number,
    carry: number | undefined,
    ship: string | undefined
): void {
    const node = nodeFor(d, itemId)
    node.needed += quantity
    const item = getItem(itemId)
    if (carry !== undefined) {
        const set = d.carries.get(itemId) ?? new Set<number>()
        set.add(carry)
        d.carries.set(itemId, set)
    }
    let left = quantity
    if (item.type === 'entity') left -= creditEntities(d, node, left, ship)
    if (item.type === 'module') left -= creditInstalled(d, node, left)
    left -= creditStock(d, node, left, STOCK_ORDER, statGate(d.goal, itemId, carry))
    expand(d, node, left, ship)
}

type RootRoute = 'install' | 'deploy' | 'upgrade' | 'plot' | 'hand'

function rootRoute(goal: Goal, recipe: Recipe): RootRoute {
    const item = getItem(goal.itemId)
    if (item.type === 'module') return goal.ship !== undefined ? 'install' : 'hand'
    if (item.type !== 'entity') return 'hand'
    if (recipe.inputs.some((i) => getItem(i.itemId).type === 'entity')) return 'upgrade'
    return isPlotBuildable(goal.itemId) ? 'plot' : 'deploy'
}

function deriveRoot(d: Derivation, recipe: Recipe): {route: RootRoute; finished: number} {
    const {goal} = d
    const route = rootRoute(goal, recipe)
    const node = nodeFor(d, goal.itemId)
    node.needed = goal.quantity
    let finished = 0
    if (route === 'install') finished = creditInstalled(d, node, goal.quantity, goal.ship)
    else if (route === 'upgrade' && goal.ship !== undefined) {
        const target = d.pool.entities.find((e) => e.entity.id === goal.ship)
        if (target && !target.used && target.entity.itemId === goal.itemId) {
            finished = creditEntities(d, node, 1, goal.ship)
        }
    } else if (route !== 'hand') finished = creditEntities(d, node, goal.quantity)
    const gate = statGate(goal, goal.itemId)
    if (route === 'hand' || route === 'deploy') {
        finished += creditStock(d, node, goal.quantity - finished, IN_HAND, gate)
    }
    let left = goal.quantity - finished
    if (route === 'install') left -= creditStock(d, node, left, STOCK_ORDER, gate)
    else if (route === 'hand' || route === 'deploy') {
        left -= creditStock(d, node, left, ['workshop', 'job'], gate)
    }
    const donorShip = route === 'upgrade' ? goal.ship : undefined
    expand(d, node, left, donorShip)
    return {route, finished}
}

function stepRank(step: GoalStep): number {
    switch (step.kind) {
        case 'book':
        case 'claim-plot':
            return 0
        case 'pickup':
            return 1
        case 'gather':
            return 2
        default:
            return 3
    }
}

function postOrder(d: Derivation, rootId: number): GoalNode[] {
    const seen = new Set<number>()
    const out: GoalNode[] = []
    const visit = (itemId: number): void => {
        if (seen.has(itemId)) return
        seen.add(itemId)
        const node = d.nodes.get(itemId)!
        for (const input of node.inputs) visit(input)
        out.push(node)
    }
    visit(rootId)
    return out
}

function deriveSteps(d: Derivation, route: RootRoute, finished: number): GoalStep[] {
    const steps: GoalStep[] = []
    const delivers = new Map<number, string[]>()
    const rootId = d.goal.itemId
    const claim: GoalStep | undefined =
        route === 'plot' && d.nodes.get(rootId)!.shortfall > 0
            ? {
                  id: `claim-plot:${rootId}`,
                  kind: 'claim-plot',
                  itemId: rootId,
                  quantity: 1,
                  dependsOn: [],
              }
            : undefined
    const plotParts = new Set(claim ? d.nodes.get(rootId)!.inputs : [])
    const ordered = postOrder(d, rootId)
    for (const node of ordered) {
        const ids: string[] = []
        const item = getItem(node.itemId)
        const waitingAt = (place: GoalCreditPlace): number =>
            node.credited.filter((c) => c.place === place).reduce((s, c) => s + c.quantity, 0)
        for (const place of ['workshop', 'job'] as const) {
            const quantity = waitingAt(place)
            if (quantity <= 0) continue
            const step: GoalStep = {
                id: `collect-${place}:${node.itemId}`,
                kind: 'pickup',
                itemId: node.itemId,
                quantity,
                dependsOn: [],
                waiting: place === 'job',
            }
            steps.push(step)
            ids.push(step.id)
        }
        if (node.shortfall > 0) {
            if (item.type === 'resource') {
                const step: GoalStep = {
                    id: `gather:${node.itemId}`,
                    kind: 'gather',
                    itemId: node.itemId,
                    quantity: node.shortfall,
                    dependsOn: [],
                }
                steps.push(step)
                ids.push(step.id)
            } else {
                const book: GoalStep = {
                    id: `book:${node.itemId}`,
                    kind: 'book',
                    itemId: node.itemId,
                    quantity: node.shortfall,
                    dependsOn: node.inputs.flatMap((i) => delivers.get(i) ?? []),
                }
                if (node.itemId === rootId && claim) book.dependsOn.push(claim.id)
                steps.push(book)
                if (!(node.itemId === rootId && route === 'plot')) {
                    const pickup: GoalStep = {
                        id: `pickup:${node.itemId}`,
                        kind: 'pickup',
                        itemId: node.itemId,
                        quantity: node.shortfall,
                        dependsOn: [book.id],
                    }
                    steps.push(pickup)
                    ids.push(pickup.id)
                }
            }
        }
        if (plotParts.has(node.itemId)) {
            for (const step of steps) {
                if (step.kind === 'pickup' && step.itemId === node.itemId) {
                    step.receiver = 'plot'
                    step.dependsOn.push(claim!.id)
                }
            }
        }
        delivers.set(node.itemId, ids)
    }
    if (claim) steps.push(claim)
    const remaining = d.goal.quantity - finished
    if (route === 'install' && remaining > 0) {
        steps.push({
            id: `install:${rootId}`,
            kind: 'install',
            itemId: rootId,
            quantity: remaining,
            dependsOn: delivers.get(rootId) ?? [],
        })
    }
    return steps
}

function deriveHunts(d: Derivation): GoalHunt[] {
    const hunts: GoalHunt[] = []
    for (const node of d.nodes.values()) {
        const item = getItem(node.itemId)
        if (item.type !== 'resource' || node.shortfall <= 0) continue
        const category = item.category as ResourceCategory
        let hunt = hunts.find((h) => h.category === category)
        if (!hunt) {
            hunt = {category, stats: [], target: d.goal.statTargets?.[category]}
            hunts.push(hunt)
        }
        for (const statIndex of d.carries.get(node.itemId) ?? []) {
            hunt.stats.push({
                resourceItemId: node.itemId,
                statIndex,
                stat: getStatName(category, statIndex as 0 | 1 | 2),
            })
        }
    }
    return hunts
}

function orderReady(steps: GoalStep[], hunts: GoalHunt[]): GoalStep[] {
    const huntIndex = (step: GoalStep): number => {
        const category = getItem(step.itemId).category
        return hunts.findIndex((h) => h.category === category)
    }
    return steps
        .filter((s) => s.dependsOn.length === 0 && !s.waiting)
        .sort((a, b) => stepRank(a) - stepRank(b) || huntIndex(a) - huntIndex(b))
}

function derive(goal: Goal, pool: Pool): GoalPlan {
    const recipe = getRecipe(goal.itemId)
    if (!recipe) {
        return {goal, available: false, finished: false, nodes: [], steps: [], ready: [], hunts: []}
    }
    const d: Derivation = {goal, pool, nodes: new Map(), carries: new Map()}
    const {route, finished} = deriveRoot(d, recipe)
    const steps = deriveSteps(d, route, finished)
    const hunts = deriveHunts(d)
    return {
        goal,
        available: true,
        finished: finished >= goal.quantity,
        nodes: [...d.nodes.values()],
        steps,
        ready: orderReady(steps, hunts),
        hunts,
    }
}

export function deriveGoals(goals: readonly Goal[], holdings: GoalHoldings): GoalPlan[] {
    const pool = buildPool(holdings)
    return goals.map((goal) => derive(goal, pool))
}

export function deriveGoal(goal: Goal, holdings: GoalHoldings): GoalPlan {
    return deriveGoals([goal], holdings)[0]
}

export function sequenceGoal(plan: GoalPlan): GoalStep[] {
    const done = new Set<string>()
    const left = plan.steps.map((s) => ({...s, waiting: false}))
    const out: GoalStep[] = []
    while (left.length > 0) {
        const open = left.map((s) => ({...s, dependsOn: s.dependsOn.filter((id) => !done.has(id))}))
        const next = orderReady(open, plan.hunts)[0]
        if (!next) break
        const index = left.findIndex((s) => s.id === next.id)
        out.push(plan.steps.find((s) => s.id === next.id)!)
        done.add(next.id)
        left.splice(index, 1)
    }
    return out
}

export interface GoalMeasure {
    actions: number
    gathers: number
    bookings: number
    pickups: number
    placements: number
    nouns: number
    hunts: number
}

const STARTER_SHIP = 10210
const STARTER_MODULES = [10101, 10100, 10102]
const DONOR_MODULES = [10101, 10100]

function measureSetup(itemId: number): {goal: Goal; holdings: GoalHoldings} {
    const recipe = getRecipe(itemId)
    const donor = recipe?.inputs.find((i) => getItem(i.itemId).type === 'entity')?.itemId
    const predecessor = recipe?.inputs.find((i) => getItem(i.itemId).type === 'module')?.itemId
    const donorIsShip = donor !== undefined && isShipItem(donor)
    const ship: GoalEntity = donorIsShip
        ? {id: 'ship', itemId: donor, installed: [...DONOR_MODULES]}
        : {id: 'ship', itemId: STARTER_SHIP, installed: [...STARTER_MODULES]}
    if (predecessor !== undefined && !ship.installed.includes(predecessor)) {
        ship.installed.push(predecessor)
    }
    const entities = [ship]
    if (donor !== undefined && !donorIsShip)
        entities.push({id: 'donor', itemId: donor, installed: []})
    const item = getItem(itemId)
    const target =
        donor !== undefined
            ? donorIsShip
                ? 'ship'
                : 'donor'
            : item.type === 'module'
              ? 'ship'
              : undefined
    const owned =
        item.type === 'module'
            ? ship.installed.filter((id) => id === itemId).length
            : donor !== undefined
              ? 0
              : entities.filter((e) => e.itemId === itemId).length
    return {
        goal: {itemId, quantity: owned + 1, ship: target},
        holdings: {stock: [], entities},
    }
}

function nounKey(itemId: number): string {
    return isShipItem(itemId) ? `hull:${itemId}` : getItem(itemId).name
}

export function measureGoal(itemId: number): GoalMeasure {
    const {goal, holdings} = measureSetup(itemId)
    const plan = deriveGoal(goal, holdings)
    const count = (...kinds: GoalStepKind[]): number =>
        plan.steps.filter((s) => kinds.includes(s.kind)).length
    const gathers = count('gather')
    const bookings = count('book')
    const pickups = count('pickup')
    const deploys = rootRoute(goal, getRecipe(itemId)!) === 'deploy' ? 1 : 0
    const placements = count('install', 'claim-plot') + deploys
    return {
        actions: gathers + bookings + pickups + placements,
        gathers,
        bookings,
        pickups,
        placements,
        nouns: new Set(plan.nodes.map((n) => nounKey(n.itemId))).size,
        hunts: plan.hunts.length,
    }
}
