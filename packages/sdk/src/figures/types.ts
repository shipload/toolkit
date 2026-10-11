import type {ModuleCapabilityKind} from '../derivation/capabilities'

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

export const FIGURE_SECTION_LABELS: Record<FigureSectionKey, string> = {
    movement: 'Movement',
    mass: 'Mass',
    energy: 'Energy',
    gathering: 'Gathering',
    crafting: 'Crafting',
    building: 'Building',
    shuttling: 'Shuttling',
    towing: 'Towing',
    warp: 'Warp',
    storage: 'Storage',
    launch: 'Launch',
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
    text: string
    note?: string
    provisional?: boolean
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
