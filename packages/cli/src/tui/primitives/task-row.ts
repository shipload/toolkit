import {Box, Text, type VChild} from '@opentui/core'
import type {ServerTypes} from '@shipload/sdk'
import {formatTaskShort} from '../../lib/format'

export const TIME_COL_WIDTH = 12
export const DURATION_COL_WIDTH = 8
export const GUTTER_WIDTH = TIME_COL_WIDTH + 3 + DURATION_COL_WIDTH + 3

export interface TaskRowSpec {
    prefix: string
    task: ServerTypes.task
    duration: string
    completionTime?: string
    fg?: string
}

export function renderTaskRow({prefix, task, duration, completionTime, fg}: TaskRowSpec): VChild {
    return Box(
        {flexDirection: 'row', width: '100%'},
        Box({width: TIME_COL_WIDTH, flexShrink: 0}, Text({content: completionTime ?? '', fg})),
        Text({content: '   ', fg}),
        Box(
            {
                width: DURATION_COL_WIDTH,
                justifyContent: 'flex-end',
                flexDirection: 'row',
                flexShrink: 0,
            },
            Text({content: duration, fg})
        ),
        Text({content: '   ', fg}),
        Box(
            {flexGrow: 1, flexShrink: 1, minWidth: 0},
            Text({content: `${prefix}${formatTaskShort(task)}`, fg})
        )
    )
}
