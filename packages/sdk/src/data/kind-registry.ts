import {Name, type NameType} from '@wharfkit/antelope'
import kindRegistryJson from './kind-registry.json'

export const CAP_WRAP = 0x01
export const CAP_UNDEPLOY = 0x02
export const CAP_DEMOLISH = 0x04
export const CAP_MODULES = 0x10

export enum EntityClass {
    OrbitalVessel = 0,
    PlanetaryStructure = 1,
}

const CLASSIFICATION_BY_NAME: Record<string, EntityClass> = {
    OrbitalVessel: EntityClass.OrbitalVessel,
    PlanetaryStructure: EntityClass.PlanetaryStructure,
}

export type EntityTypeName =
    | 'ship'
    | 'warehouse'
    | 'extractor'
    | 'factory'
    | 'container'
    | 'nexus'

export interface KindMeta {
    kind: Name
    classification: EntityClass
    capabilityFlags: number
    zCoord: number
    defaultLabel: string
}

export interface TemplateMeta {
    itemId: number
    kind: Name
    displayLabel: string
}

interface RawKindEntry {
    kind: string
    classification: string
    capabilityFlags: number
    zCoord: number
    defaultLabel: string
}

interface RawTemplateEntry {
    itemId: number
    kind: string
    displayLabel: string
}

const KIND_META: Map<string, KindMeta> = (() => {
    const m = new Map<string, KindMeta>()
    for (const r of kindRegistryJson.kinds as RawKindEntry[]) {
        const cls = CLASSIFICATION_BY_NAME[r.classification]
        if (cls === undefined) {
            throw new Error(`kind-registry: unknown classification "${r.classification}" for kind ${r.kind}`)
        }
        m.set(r.kind, {
            kind: Name.from(r.kind),
            classification: cls,
            capabilityFlags: r.capabilityFlags,
            zCoord: r.zCoord,
            defaultLabel: r.defaultLabel,
        })
    }
    return m
})()

const TEMPLATE_BY_ITEM_ID: Map<number, TemplateMeta> = (() => {
    const m = new Map<number, TemplateMeta>()
    for (const r of kindRegistryJson.templates as RawTemplateEntry[]) {
        m.set(r.itemId, {
            itemId: r.itemId,
            kind: Name.from(r.kind),
            displayLabel: r.displayLabel,
        })
    }
    return m
})()

function nameKey(kind: NameType | EntityTypeName): string {
    if (typeof kind === 'string') return kind
    return Name.from(kind).toString()
}

export function getKindMeta(kind: NameType | EntityTypeName): KindMeta | undefined {
    return KIND_META.get(nameKey(kind))
}

export function getTemplateMeta(itemId: number): TemplateMeta | undefined {
    return TEMPLATE_BY_ITEM_ID.get(itemId)
}

export function getPackedEntityType(itemId: number): Name | null {
    return TEMPLATE_BY_ITEM_ID.get(itemId)?.kind ?? null
}

export function kindCan(kind: NameType | EntityTypeName, cap: number): boolean {
    const m = KIND_META.get(nameKey(kind))
    return m !== undefined && (m.capabilityFlags & cap) !== 0
}

export function getEntityClass(kind: NameType | EntityTypeName): EntityClass {
    const m = KIND_META.get(nameKey(kind))
    if (!m) throw new Error(`Entity type has no class: ${nameKey(kind)}`)
    return m.classification
}
