import {Box, Text, type VChild} from '@opentui/core'
import type {ServerTypes} from '@shipload/sdk'
import {formatTaskShort} from '../../lib/format'

const DURATION_COL_WIDTH = 10
const COMPLETION_COL_WIDTH = 13

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
        Box(
            {flexGrow: 1, flexShrink: 1, minWidth: 0},
            Text({content: `${prefix}${formatTaskShort(task)}`, fg})
        ),
        Box(
            {width: DURATION_COL_WIDTH, justifyContent: 'flex-end', flexDirection: 'row'},
            Text({content: duration, fg})
        ),
        Box(
            {width: COMPLETION_COL_WIDTH, justifyContent: 'flex-end', flexDirection: 'row'},
            Text({content: completionTime ?? '', fg})
        )
    )
}
