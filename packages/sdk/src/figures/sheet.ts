import {
    clampUint32,
    getSlotAmp,
    packedModulesToInstalled,
    type InstalledModule,
} from '../entities/slot-multiplier'
import {getEntityLayout, type EntitySlot} from '../data/recipes-runtime'
import {getItem} from '../data/catalog'
import {
    computeEntityCapabilities,
    computeLoaderWorkerMass,
    computeModuleCapabilities,
    type ComputedCapabilities,
    type ModuleCapabilities,
} from '../derivation/capabilities'
import {moduleDisplayName} from '../nft/description'
import type {ServerContract} from '../contracts'
import {MASS_UNITS_PER_TONNE} from '../types'
import {
    craftDrainPerKiloTonne,
    cruiseSpeedLyPerHour,
    gatherDrainPerMinute,
    milliToEnergy,
} from './reference'
import {formatFixed} from './format'
import {
    countFigure,
    craftDrainFigure,
    depthFigure,
    distanceFigure,
    energyFigure,
    gatherDrainFigure,
    handlingFigure,
    inputSpeedFigure,
    jumpFigure,
    rechargeFigure,
    speedFigure,
    tonnesFigure,
    towsFigure,
    transferFigure,
    travelDrainFigure,
    yieldFigure,
} from './module'
import {
    FIGURE_SECTION_LABELS,
    type EntitySheet,
    type Figure,
    type FigureLine,
    type FigureSectionKey,
    type SheetRow,
    type SheetRowDiff,
    type SheetSection,
    type SheetSectionDiff,
    type WorkerGroup,
} from './types'

export const SHEET_SECTION_ORDER: readonly FigureSectionKey[] = [
    'movement',
    'mass',
    'energy',
    'gathering',
    'crafting',
    'building',
    'shuttling',
    'towing',
    'warp',
    'storage',
]

export const SHEET_HEADLINES: Partial<Record<FigureSectionKey, string>> = {
    movement: 'speed',
    mass: 'total',
    energy: 'capacity',
    gathering: 'yield',
    crafting: 'speed',
    building: 'speed',
    shuttling: 'transfer',
    towing: 'tows',
    warp: 'jump',
    storage: 'capacity',
}

export interface EntitySheetAnchor {
    capacity?: number
    hullmass?: number
}

export interface EntitySheetInput {
    itemId: number
    modules: InstalledModule[]
    layout?: EntitySlot[]
    hullStats?: Record<string, number>
    anchor?: EntitySheetAnchor
    cargoMass?: number
}

export interface EntitySheetSource {
    item_id: {toNumber(): number} | number
    modules: ServerContract.Types.module_entry[]
    hullmass?: {toNumber(): number} | number
    capacity?: {toNumber(): number} | number
    cargomass?: {toNumber(): number} | number
}

export interface ModuleFitPreview {
    before: EntitySheet
    after: EntitySheet
    diff: SheetSectionDiff[]
}

interface FittedModule {
    module: InstalledModule
    outputPct: number
    caps: ModuleCapabilities
}

interface SheetContext {
    itemId: number
    caps: ComputedCapabilities
    fitted: FittedModule[]
    hullBase: {capacity: number; hullmass: number}
    cargoMass: number
}

function num(value: {toNumber(): number} | number | undefined): number | undefined {
    if (value === undefined) return undefined
    return typeof value === 'number' ? value : value.toNumber()
}

export function entitySheetInput(entity: EntitySheetSource): EntitySheetInput {
    return {
        itemId: num(entity.item_id) ?? 0,
        modules: packedModulesToInstalled(entity.modules),
        anchor: {capacity: num(entity.capacity), hullmass: num(entity.hullmass)},
        cargoMass: num(entity.cargomass) ?? 0,
    }
}

function fitModules(modules: InstalledModule[], layout: EntitySlot[]): FittedModule[] {
    const fitted: FittedModule[] = []
    for (const module of [...modules].sort((a, b) => a.slotIndex - b.slotIndex)) {
        const outputPct = getSlotAmp(layout, module.slotIndex)
        const caps = computeModuleCapabilities(module.itemId, module.stats, outputPct)
        if (caps) fitted.push({module, outputPct, caps})
    }
    return fitted
}

function storageSum(fitted: FittedModule[]): number {
    return fitted.reduce((sum, f) => sum + (f.caps.kind === 'storage' ? f.caps.capacity : 0), 0)
}

function moduleMassSum(modules: InstalledModule[]): number {
    return modules.reduce((sum, m) => sum + getItem(m.itemId).mass, 0)
}

function resolveLayout(input: EntitySheetInput): EntitySlot[] {
    return input.layout ?? getEntityLayout(input.itemId)?.slots ?? []
}

function resolveHullBase(input: EntitySheetInput): {capacity: number; hullmass: number} {
    const layout = resolveLayout(input)
    const caps = computeEntityCapabilities(
        input.hullStats ?? {},
        input.itemId,
        input.modules,
        layout
    )
    const fitted = fitModules(input.modules, layout)
    const capacity = input.anchor?.capacity ?? caps.capacity
    const hullmass = input.anchor?.hullmass ?? caps.hullmass
    return {
        capacity: Math.max(0, capacity - storageSum(fitted)),
        hullmass: Math.max(0, hullmass - moduleMassSum(input.modules)),
    }
}

function contextFor(
    input: EntitySheetInput,
    hullBase: {capacity: number; hullmass: number}
): SheetContext {
    const layout = resolveLayout(input)
    const caps = computeEntityCapabilities(
        input.hullStats ?? {},
        input.itemId,
        input.modules,
        layout
    )
    const fitted = fitModules(input.modules, layout)
    caps.capacity = clampUint32(hullBase.capacity + storageSum(fitted))
    caps.hullmass = hullBase.hullmass + moduleMassSum(input.modules)
    return {itemId: input.itemId, caps, fitted, hullBase, cargoMass: input.cargoMass ?? 0}
}

function line(f: FittedModule, figure: Figure): FigureLine {
    return {
        label: moduleDisplayName(f.module.itemId),
        value: figure.value,
        unit: figure.unit,
        text: figure.text,
        itemId: f.module.itemId,
        slotIndex: f.module.slotIndex,
        outputPct: f.outputPct,
    }
}

function plainLine(label: string, figure: Figure): FigureLine {
    return {label, value: figure.value, unit: figure.unit, text: figure.text}
}

function numberPart(figure: Figure): string {
    const suffix = figure.unit ? ` ${figure.unit}` : ''
    return suffix && figure.text.endsWith(suffix)
        ? figure.text.slice(0, -suffix.length)
        : figure.text
}

export function collapseWorkers(figures: Figure[]): WorkerGroup[] {
    const groups: WorkerGroup[] = []
    for (const figure of figures) {
        const text = numberPart(figure)
        const group = groups.find((g) => g.text === text)
        if (group) group.count += 1
        else groups.push({count: 1, value: figure.value, text})
    }
    return groups
}

export function formatWorkerGroups(groups: WorkerGroup[], unit: string): string {
    const body = groups.map((g) => (g.count > 1 ? `${g.count} × ${g.text}` : g.text)).join(' + ')
    return unit ? `${body} ${unit}` : body
}

function workerRow(
    key: string,
    label: string,
    figures: Figure[],
    fitted: FittedModule[]
): SheetRow {
    const groups = collapseWorkers(figures)
    const unit = figures[0]?.unit ?? ''
    return {
        key,
        label,
        value: Math.max(0, ...groups.map((g) => g.value)),
        unit,
        text: formatWorkerGroups(groups, unit),
        provisional: figures.some((f) => f.provisional) || undefined,
        headline: false,
        workers: groups,
        breakdown: figures.map((f, i) => line(fitted[i], f)),
    }
}

function row(figure: Figure, breakdown?: FigureLine[]): SheetRow {
    return breakdown ? {...figure, headline: false, breakdown} : {...figure, headline: false}
}

function ofKind<K extends ModuleCapabilities['kind']>(
    fitted: FittedModule[],
    kind: K
): (FittedModule & {caps: Extract<ModuleCapabilities, {kind: K}>})[] {
    return fitted.filter((f) => f.caps.kind === kind) as (FittedModule & {
        caps: Extract<ModuleCapabilities, {kind: K}>
    })[]
}

function totalMass(ctx: SheetContext, cargoMass: number): number {
    return ctx.caps.hullmass + cargoMass + workerMass(ctx)
}

function workerMass(ctx: SheetContext): number {
    return computeLoaderWorkerMass(ofKind(ctx.fitted, 'loader').map((f) => f.caps.mass))
}

function movementSection(ctx: SheetContext): SheetRow[] {
    const engines = ctx.caps.engines
    if (!engines) return []
    const current = totalMass(ctx, ctx.cargoMass)
    const empty = speedFigure(
        'emptyHold',
        'Empty hold',
        cruiseSpeedLyPerHour(engines.thrust, totalMass(ctx, 0))
    )
    const full = speedFigure(
        'fullHold',
        'Full hold',
        cruiseSpeedLyPerHour(engines.thrust, totalMass(ctx, ctx.caps.capacity))
    )
    const perEngine = ofKind(ctx.fitted, 'engine').map((f) =>
        line(f, speedFigure('speed', 'Speed', cruiseSpeedLyPerHour(f.caps.thrust, current)))
    )
    return [
        row(speedFigure('speed', 'Speed', cruiseSpeedLyPerHour(engines.thrust, current)), [
            plainLine(empty.label, empty),
            plainLine(full.label, full),
            ...perEngine,
        ]),
    ]
}

function massSection(ctx: SheetContext): SheetRow[] {
    if (!ctx.caps.engines) return []
    const modules = ctx.caps.hullmass - ctx.hullBase.hullmass
    const workers = workerMass(ctx)
    const lines = [
        plainLine('Hull', tonnesFigure('hull', 'Hull', ctx.hullBase.hullmass)),
        plainLine('Modules', tonnesFigure('modules', 'Modules', modules)),
        plainLine('Cargo', tonnesFigure('cargo', 'Cargo', ctx.cargoMass)),
    ]
    if (workers > 0)
        lines.push(plainLine('Shuttles', tonnesFigure('shuttles', 'Shuttles', workers)))
    return [row(tonnesFigure('total', 'Total', totalMass(ctx, ctx.cargoMass)), lines)]
}

function energySection(ctx: SheetContext): SheetRow[] {
    const {generator, travelDrain} = ctx.caps
    const rows: SheetRow[] = []
    if (generator) {
        const capacityLines = ctx.fitted.flatMap((f) =>
            f.caps.kind === 'generator' || f.caps.kind === 'battery'
                ? [line(f, energyFigure('capacity', 'Capacity', f.caps.capacity, true))]
                : []
        )
        rows.push(row(energyFigure('capacity', 'Capacity', generator.capacity), capacityLines))
        rows.push(
            row(
                rechargeFigure('recharge', 'Recharge', generator.recharge),
                ofKind(ctx.fitted, 'generator').map((f) =>
                    line(f, rechargeFigure('recharge', 'Recharge', f.caps.recharge, true))
                )
            )
        )
        if (travelDrain && travelDrain.total > 0) {
            rows.push(row(distanceFigure('range', 'Range', generator.capacity / travelDrain.total)))
        }
    }
    if (travelDrain) {
        const lines: FigureLine[] = [
            plainLine('Engines', travelDrainFigure('engines', 'Engines', travelDrain.engine)),
        ]
        for (const f of ctx.fitted) {
            if (f.caps.kind === 'storage' || f.caps.kind === 'hauler') {
                lines.push(line(f, travelDrainFigure('drain', 'Drain', f.caps.drain)))
            }
        }
        rows.push(row(travelDrainFigure('travelDrain', 'Travel drain', travelDrain.total), lines))
    }
    return rows
}

function perChargeRow(
    ctx: SheetContext,
    figure: (capacityMilli: number) => Figure | undefined
): SheetRow[] {
    const capacity = ctx.caps.generator?.capacity
    if (!capacity) return []
    const f = figure(capacity)
    return f ? [row(f)] : []
}

function gatheringSection(ctx: SheetContext): SheetRow[] {
    const bays = ofKind(ctx.fitted, 'gatherer')
    if (bays.length === 0) return []
    const drainPerMinute = bays.reduce((sum, f) => sum + gatherDrainPerMinute(f.caps.drain), 0)
    return [
        workerRow(
            'yield',
            'Yield',
            bays.map((f) => yieldFigure('yield', 'Yield', f.caps.yield)),
            bays
        ),
        workerRow(
            'depth',
            'Depth',
            bays.map((f) => depthFigure('depth', 'Depth', f.caps.depth)),
            bays
        ),
        workerRow(
            'drain',
            'Drain',
            bays.map((f) => gatherDrainFigure('drain', 'Drain', f.caps.drain)),
            bays
        ),
        ...perChargeRow(ctx, (capacity) => {
            if (drainPerMinute <= 0) return undefined
            const minutes = milliToEnergy(capacity) / drainPerMinute
            return {
                key: 'perCharge',
                label: 'Per charge',
                value: minutes,
                unit: 'min',
                text: `${formatFixed(minutes)} min`,
            }
        }),
    ]
}

function workSection(ctx: SheetContext, kind: 'crafter' | 'builder'): SheetRow[] {
    const workers = ofKind(ctx.fitted, kind)
    if (workers.length === 0) return []
    const speedSum = workers.reduce((sum, f) => sum + f.caps.speed, 0)
    const drainRate = workers.reduce(
        (sum, f) => sum + f.caps.speed * craftDrainPerKiloTonne(f.caps.drain),
        0
    )
    return [
        workerRow(
            'speed',
            'Speed',
            workers.map((f) => inputSpeedFigure('speed', 'Speed', f.caps.speed)),
            workers
        ),
        workerRow(
            'drain',
            'Drain',
            workers.map((f) => craftDrainFigure('drain', 'Drain', f.caps.drain)),
            workers
        ),
        ...perChargeRow(ctx, (capacity) => {
            if (drainRate <= 0) return undefined
            const tonnes = (milliToEnergy(capacity) * 1000 * speedSum) / drainRate
            return tonnesFigure('perCharge', 'Per charge', tonnes * MASS_UNITS_PER_TONNE)
        }),
    ]
}

function shuttlingSection(ctx: SheetContext): SheetRow[] {
    const bays = ofKind(ctx.fitted, 'loader')
    if (bays.length === 0) return []
    return [
        workerRow(
            'transfer',
            'Transfer',
            bays.map((f) => transferFigure('transfer', 'Transfer', f.caps.thrust, f.caps.mass)),
            bays
        ),
        row(countFigure('shuttles', 'Shuttles', bays.length)),
    ]
}

function towingSection(ctx: SheetContext): SheetRow[] {
    const hauler = ctx.caps.hauler
    if (!hauler) return []
    const beams = ofKind(ctx.fitted, 'hauler')
    return [
        row(
            towsFigure('tows', 'Tows', hauler.capacityByTier),
            beams.map((f) =>
                line(
                    f,
                    towsFigure('tows', 'Tows', [{tier: f.caps.tier, capacity: f.caps.capacity}])
                )
            )
        ),
        row(
            handlingFigure('handling', 'Handling', hauler.efficiency),
            beams.map((f) => line(f, handlingFigure('handling', 'Handling', f.caps.efficiency)))
        ),
    ]
}

function warpSection(ctx: SheetContext): SheetRow[] {
    const warp = ctx.caps.warp
    if (!warp) return []
    return [
        row(
            jumpFigure('jump', 'Jump distance', warp.range),
            ofKind(ctx.fitted, 'warp').map((f) =>
                line(f, distanceFigure('jump', 'Jump distance', f.caps.range))
            )
        ),
    ]
}

function storageSection(ctx: SheetContext): SheetRow[] {
    if (ctx.caps.capacity <= 0) return []
    const lines: FigureLine[] = []
    if (ctx.hullBase.capacity > 0) {
        lines.push(plainLine('Hull', tonnesFigure('hull', 'Hull', ctx.hullBase.capacity)))
    }
    for (const f of ofKind(ctx.fitted, 'storage')) {
        lines.push(line(f, tonnesFigure('capacity', 'Capacity', f.caps.capacity, true)))
    }
    return [row(tonnesFigure('capacity', 'Capacity', ctx.caps.capacity), lines)]
}

const SECTION_BUILDERS: Record<string, (ctx: SheetContext) => SheetRow[]> = {
    movement: movementSection,
    mass: massSection,
    energy: energySection,
    gathering: gatheringSection,
    crafting: (ctx) => workSection(ctx, 'crafter'),
    building: (ctx) => workSection(ctx, 'builder'),
    shuttling: shuttlingSection,
    towing: towingSection,
    warp: warpSection,
    storage: storageSection,
}

function buildSheet(ctx: SheetContext): EntitySheet {
    const sections: SheetSection[] = []
    for (const key of SHEET_SECTION_ORDER) {
        const rows = SECTION_BUILDERS[key](ctx)
        if (rows.length === 0) continue
        const preferred = SHEET_HEADLINES[key]
        const headline = rows.some((r) => r.key === preferred) ? (preferred as string) : rows[0].key
        for (const r of rows) r.headline = r.key === headline
        sections.push({key, label: FIGURE_SECTION_LABELS[key], headline, rows})
    }
    return {itemId: ctx.itemId, sections}
}

export function computeEntitySheet(input: EntitySheetInput): EntitySheet {
    return buildSheet(contextFor(input, resolveHullBase(input)))
}

export function diffEntitySheets(before: EntitySheet, after: EntitySheet): SheetSectionDiff[] {
    const diffs: SheetSectionDiff[] = []
    for (const key of SHEET_SECTION_ORDER) {
        const a = before.sections.find((s) => s.key === key)
        const b = after.sections.find((s) => s.key === key)
        if (!a && !b) continue
        const headline = (b ?? a)?.headline ?? ''
        const rowKeys: string[] = []
        for (const r of [...(a?.rows ?? []), ...(b?.rows ?? [])]) {
            if (!rowKeys.includes(r.key)) rowKeys.push(r.key)
        }
        const rows: SheetRowDiff[] = []
        for (const rowKey of rowKeys) {
            const ra = a?.rows.find((r) => r.key === rowKey)
            const rb = b?.rows.find((r) => r.key === rowKey)
            const changed = ra?.text !== rb?.text
            const isHeadline = rowKey === headline
            if (!changed && !isHeadline) continue
            const ref = (rb ?? ra) as SheetRow
            rows.push({
                key: rowKey,
                label: ref.label,
                unit: ref.unit,
                headline: isHeadline,
                before: ra,
                after: rb,
                changed,
            })
        }
        diffs.push({key, label: FIGURE_SECTION_LABELS[key], headline, rows})
    }
    return diffs
}

export function previewModuleFit(
    input: EntitySheetInput,
    slotIndex: number,
    replacement: {itemId: number; stats: bigint} | null
): ModuleFitPreview {
    const hullBase = resolveHullBase(input)
    const modules = input.modules.filter((m) => m.slotIndex !== slotIndex)
    if (replacement) modules.push({slotIndex, itemId: replacement.itemId, stats: replacement.stats})
    const before = buildSheet(contextFor(input, hullBase))
    const after = buildSheet(contextFor({...input, modules}, hullBase))
    return {before, after, diff: diffEntitySheets(before, after)}
}
