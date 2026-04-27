import {Box, Text, type VChild} from '@opentui/core'
import type {Types} from '../../contracts/server'
import {formatTaskShort} from '../../lib/format'

export interface TaskRowSpec {
    prefix: string
    task: Types.task
    suffix: string
    fg?: string
}

export function renderTaskRow({prefix, task, suffix, fg}: TaskRowSpec): VChild {
    return Box(
        {flexDirection: 'row', justifyContent: 'space-between', width: '100%'},
        Text({content: `${prefix}${formatTaskShort(task)}`, fg}),
        Text({content: suffix, fg})
    )
}
