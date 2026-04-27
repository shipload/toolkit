import {Box, Text, type VChild} from '@opentui/core'

export interface HeaderOpts {
    entityType: string
    entityId: bigint | number
    entityName?: string
    sinceLastFetch_s: number
}

export function renderHeader(opts: HeaderOpts): VChild {
    const left = formatLeft(opts)
    const right = formatRight(opts.sinceLastFetch_s)
    const rightColor = staleColor(opts.sinceLastFetch_s)
    return Box(
        {flexDirection: 'row', justifyContent: 'space-between'},
        Text({content: left, fg: '#FFFFFF'}),
        Text({content: right, fg: rightColor})
    )
}

function formatLeft(opts: HeaderOpts): string {
    const name = opts.entityName?.trim()
    const ref = `${opts.entityType} ${opts.entityId}`
    const typeLabel = capitalize(opts.entityType)
    return name ? `${typeLabel} "${name}" · ${ref}` : ref
}

function formatRight(sinceLastFetch_s: number): string {
    return `live · ${Math.max(0, Math.round(sinceLastFetch_s))}s since fetch`
}

function staleColor(sinceLastFetch_s: number): string {
    if (sinceLastFetch_s < 10) return '#00FF66'
    if (sinceLastFetch_s < 30) return '#FFCC00'
    return '#FF5555'
}

function capitalize(s: string): string {
    return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}
