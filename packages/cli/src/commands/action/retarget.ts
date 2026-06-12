import {schedule, type ServerTypes, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseEntityType, parseUint64} from '../../lib/args'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'

export interface RetargetOpts {
    sourceId: bigint
    taskIndex: bigint
    newDestId: bigint
}

export async function buildAction(opts: RetargetOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.retarget(opts.sourceId, opts.taskIndex, opts.newDestId)
}

const TASK_UNLOAD = 4

export function findRetargetableLane(
    snap: {lanes: ServerTypes.lane[]},
    localIndex: number,
    now: Date
): {laneKey: number; task: ServerTypes.task} | null {
    for (const l of schedule.getLanes(snap)) {
        const task = l.schedule.tasks[localIndex] as ServerTypes.task | undefined
        if (!task) continue
        if (Number(task.type.toString()) !== TASK_UNLOAD) continue
        if (!task.entitytarget) continue
        if (schedule.laneTaskCompleteOf(snap, l.laneKey, localIndex, now)) continue
        if (schedule.laneTaskInProgressOf(snap, l.laneKey, localIndex, now)) continue
        return {laneKey: l.laneKey, task}
    }
    return null
}

export async function runRetarget(
    ctx: EntityContext,
    taskIndex: bigint,
    destType: EntityTypeName,
    destId: bigint
): Promise<void> {
    const snap = await getEntitySnapshot(ctx.entityId)
    const idx = Number(taskIndex)
    const hit = findRetargetableLane(snap, idx, new Date())
    if (!hit) {
        throw new ValidationError(
            `task #${idx} on ${ctx.entityType} ${ctx.entityId} is not a pending outgoing transfer`,
            `review with: shiploadcli ${ctx.entityType} ${ctx.entityId} tasks`
        )
    }

    const action = await buildAction({
        sourceId: ctx.entityId,
        taskIndex,
        newDestId: destId,
    })
    await transact(
        {action},
        {
            description: `Retargeting ${ctx.entityType} ${ctx.entityId} task #${idx} to ${destType} ${destId}`,
        }
    )
}

const HELP_BEFORE = `Repoint a pending outgoing transfer (UNLOAD) to a different, co-located destination.
The schedule slides earlier when the new destination is free sooner.

  retarget <task-index> <dest-type> <dest-id>
`

export const SUBCOMMAND: EntitySubcommand = {
    name: 'retarget',
    description: 'Repoint a pending outgoing transfer to a different destination',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('retarget')
            .description('Repoint a pending outgoing transfer to a different destination')
            .addHelpText('before', HELP_BEFORE)
            .argument(
                '<task-index>',
                'index of the outgoing transfer task (see `tasks`)',
                parseUint64
            )
            .argument('<dest-type>', 'new destination entity type', parseEntityType)
            .argument('<dest-id>', 'new destination entity id', parseUint64)
            .action(async (taskIndex: bigint, destType: EntityTypeName, destId: bigint) => {
                await runRetarget(ctx, taskIndex, destType, destId)
            }),
}
