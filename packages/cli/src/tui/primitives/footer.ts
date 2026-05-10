import {Box, Text, type VChild} from '@opentui/core'
import type {HotkeyHint} from '../hotkeys'

export type FooterStatus =
    | {kind: 'ready'}
    | {kind: 'submitting'; label: string}
    | {kind: 'ok'; label: string}
    | {kind: 'err'; label: string}

export interface FooterMeta {
    sinceLastFetch_s: number
}

export function renderFooter(
    hints: HotkeyHint[],
    status: FooterStatus,
    meta?: FooterMeta
): VChild {
    const left = hints.map((h) => `${h.key} ${h.label}`).join('  ·  ')
    const right = formatStatus(status)
    const rightChildren: VChild[] = []
    if (meta) {
        const {glyph, label, fg} = formatMeta(meta)
        rightChildren.push(Text({content: glyph, fg}))
        rightChildren.push(Text({content: ` ${label}  ·  `, fg: '#888888'}))
    }
    rightChildren.push(Text({content: right, fg: statusColor(status)}))
    return Box(
        {flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 1, paddingRight: 1},
        Text({content: left, fg: '#888888'}),
        Box({flexDirection: 'row'}, ...rightChildren)
    )
}

function formatMeta(meta: FooterMeta): {glyph: string; label: string; fg: string} {
    const s = Math.max(0, Math.round(meta.sinceLastFetch_s))
    if (s < 10) return {glyph: '●', label: `live · ${s}s`, fg: '#00FF66'}
    if (s < 30) return {glyph: '◐', label: `live · ${s}s`, fg: '#FFCC00'}
    return {glyph: '○', label: `stale · ${s}s`, fg: '#FF5555'}
}

function formatStatus(status: FooterStatus): string {
    switch (status.kind) {
        case 'ready':
            return '✓ ready'
        case 'submitting':
            return `${status.label}...`
        case 'ok':
            return `✓ ${status.label}`
        case 'err':
            return `✗ ${status.label}`
    }
}

function statusColor(status: FooterStatus): string {
    switch (status.kind) {
        case 'ok':
            return '#00FF66'
        case 'err':
            return '#FF5555'
        case 'submitting':
            return '#FFCC00'
        default:
            return '#888888'
    }
}
