import type {ModuleCapabilityKind} from '../derivation/capabilities'
import {textRecord} from '../text/registry'

export type FigureSectionKey =
    | 'movement'
    | 'mass'
    | 'energy'
    | 'gathering'
    | 'crafting'
    | 'building'
    | 'shuttling'
    | 'towing'
    | 'warp'
    | 'storage'
    | 'launch'

export const FIGURE_SECTION_LABELS: Record<FigureSectionKey, string> = textRecord(
    {
        movement: 'Movement',
        mass: 'Mass',
        energy: 'Energy',
        gathering: 'Gathering',
        crafting: 'Crafting',
        building: 'Building',
        shuttling: 'Shuttling',
        towing: 'Hauling',
        warp: 'Warp',
        storage: 'Storage',
        launch: 'Launch',
    },
    (key) => `figure-section.${key}.label`
)

const FIGURE_LABELS: Record<string, string> = textRecord(
    {
        speed: 'Speed',
        drain: 'Drain',
        capacity: 'Capacity',
        recharge: 'Recharge',
        tows: 'Hauls',
        handling: 'Handling',
        jump: 'Jump distance',
        yield: 'Yield',
        depth: 'Depth',
        transfer: 'Transfer',
        payload: 'Payload',
        shuttles: 'Shuttles',
        charge: 'Charge',
        launchSpeed: 'Launch speed',
        emptyHold: 'Empty hold',
        fullHold: 'Full hold',
        hull: 'Hull',
        modules: 'Modules',
        cargo: 'Cargo',
        total: 'Total',
        range: 'Range',
        engines: 'Engines',
        rangeFloor: 'Range floor',
        travelDrain: 'Travel drain',
        perCharge: 'Per charge',
    },
    (key) => `figure.${key}.label`
)

export function figureLabel(key: string): string {
    return FIGURE_LABELS[key] ?? key
}

export const MODULE_FIGURE_SECTION: Record<ModuleCapabilityKind, FigureSectionKey> = {
    engine: 'movement',
    generator: 'energy',
    battery: 'energy',
    gatherer: 'gathering',
    loader: 'shuttling',
    storage: 'storage',
    crafter: 'crafting',
    builder: 'building',
    hauler: 'towing',
    warp: 'warp',
    launcher: 'launch',
}

export interface Figure {
    key: string
    label: string
    value: number
    unit: string
    number: string
    text: string
    note?: string
}

export interface ModuleFigures {
    itemId: number
    kind: ModuleCapabilityKind
    section: FigureSectionKey
    sectionLabel: string
    rows: Figure[]
}

export interface FigureLine {
    label: string
    value: number
    unit: string
    text: string
    itemId?: number
    slotIndex?: number
    outputPct?: number
}

export interface WorkerGroup {
    count: number
    value: number
    text: string
}

export interface SheetRow extends Figure {
    headline: boolean
    breakdown?: FigureLine[]
    workers?: WorkerGroup[]
}

export interface SheetSection {
    key: FigureSectionKey
    label: string
    headline: string
    rows: SheetRow[]
}

export interface EntitySheet {
    itemId: number
    sections: SheetSection[]
}

export interface SheetRowDiff {
    key: string
    label: string
    unit: string
    headline: boolean
    before?: SheetRow
    after?: SheetRow
    changed: boolean
}

export interface SheetSectionDiff {
    key: FigureSectionKey
    label: string
    headline: string
    rows: SheetRowDiff[]
}
