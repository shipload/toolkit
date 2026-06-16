import type {Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {
    buildCargoMoveAction,
    type CargoMoveOpts,
    type CargoMoveSpec,
    cargoMoveSubcommand,
} from '../../lib/cargo-move-command'

const SPEC: CargoMoveSpec = {
    name: 'load',
    summary: 'Load cargo from a co-located entity you own (pulls cargo onto this entity)',
    requires:
        'Requires: both entities owned by caller and co-located; the source has the cargo on hand; this entity has loaders and capacity.',
    counterpartTypeArg: ['<from-type>', 'source entity type'],
    counterpartIdArg: ['<from-id>', 'source entity id'],
    cargoArgHint: '<item-id>:<stack-id>:<qty> — cargo to load.',
    example: `
Example:
  # Load 100 of item 5 (stack 0) onto ship 1 from warehouse 2
  shiploadcli ship 1 load warehouse 2 5:0:100

Use \`shiploadcli ship N cargo\` to find item-ids and stack-ids.`,
    act: (sl, entityId, otherId, items) => sl.actions.load(entityId, otherId, items),
    describe: (input, ctx, otherType, otherId) =>
        `Loaded ${input.quantity} of item ${input.itemId} onto ${ctx.entityType}:${ctx.entityId} from ${otherType}:${otherId}`,
}

export function buildAction(opts: CargoMoveOpts, shipload?: Shipload): Promise<Action> {
    return buildCargoMoveAction(SPEC, opts, shipload)
}

export const SUBCOMMAND = cargoMoveSubcommand(SPEC)
