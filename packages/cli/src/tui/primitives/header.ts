import {Box, Text, type VChild} from '@opentui/core'

export interface HeaderOpts {
    entityType: string
    entityId: bigint | number
    entityName?: string
    owner?: string
}

export function renderHeader(opts: HeaderOpts): VChild {
    const type = opts.entityType.toUpperCase()
    const idPart = `#${opts.entityId}`
    const name = opts.entityName?.trim()
    const namePart = name ? ` "${name}"` : ''
    const ownerPart = opts.owner ? `  ·  ${opts.owner}` : ''
    return Box(
        {flexDirection: 'row'},
        Text({content: `${type} ${idPart}${namePart}`, fg: '#FFFFFF'}),
        Text({content: ownerPart, fg: '#888888'})
    )
}
