import {Box, Text, type VChild} from '@opentui/core'
import type {HotkeyHint} from '../hotkeys'

export type FooterStatus =
    | {kind: 'ready'}
    | {kind: 'submitting'; label: string}
    | {kind: 'ok'; label: string}
    | {kind: 'err'; label: string}

export function renderFooter(hints: HotkeyHint[], status: FooterStatus): VChild {
    const left = hints.map((h) => `${h.key} ${h.label}`).join('  ·  ')
    const right = formatStatus(status)
    return Box(
        {flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 1, paddingRight: 1},
        Text({content: left, fg: '#888888'}),
        Text({content: right, fg: statusColor(status)})
    )
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
