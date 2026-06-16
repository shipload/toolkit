import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {
    buildCargoMoveAction,
    type CargoMoveOpts,
    type CargoMoveSpec,
    cargoMoveSubcommand,
} from '../../lib/cargo-move-command'

const SPEC: CargoMoveSpec = {
    name: 'unload',
    summary: 'Unload cargo to a co-located entity you own (pushes cargo off this entity)',
    requires:
        'Requires: both entities owned by caller and co-located; this entity has loaders; the destination has capacity (or, for a build plot, accepts the recipe inputs).',
    counterpartTypeArg: ['<to-type>', 'destination entity type'],
    counterpartIdArg: ['<to-id>', 'destination entity id'],
    cargoArgHint: '<item-id>:<stack-id>:<qty> — cargo to unload.',
    example: `
Example:
  # Unload 100 of item 5 (stack 0) from ship 1 to warehouse 2
  shiploadcli ship 1 unload warehouse 2 5:0:100

Use \`shiploadcli ship N cargo\` to find item-ids and stack-ids.`,
    act: (sl, entityId, otherId, items) => sl.actions.unload(entityId, otherId, items),
    describe: (input, ctx, otherType, otherId) =>
        `Unloaded ${input.quantity} of item ${input.itemId} from ${ctx.entityType}:${ctx.entityId} to ${otherType}:${otherId}`,
}

export function buildAction(opts: CargoMoveOpts, shipload?: Shipload): Promise<Action> {
    return buildCargoMoveAction(SPEC, opts, shipload)
}

export const SUBCOMMAND = cargoMoveSubcommand(SPEC)
