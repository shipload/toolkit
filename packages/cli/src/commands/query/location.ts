import {Command} from 'commander'
import {type EntityRef, parseEntityRef, parseInt64, parseUint32} from '../../lib/args'
import {buildCoordParent, type CoordContext} from '../../lib/coord-scope'
import {loadLocationStrata} from '../../lib/location-loader'
import {renderStrata} from '../../lib/strata-render'

export function parseCoords(xStr: string, yStr: string): {x: bigint; y: bigint} {
    return {x: parseInt64(xStr), y: parseInt64(yStr)}
}

export interface LocationQueryOpts {
    entity?: EntityRef
    all?: boolean
    top?: number
    json?: boolean
}

async function showStrata(ctx: CoordContext, opts: LocationQueryOpts): Promise<void> {
    const view = await loadLocationStrata({x: ctx.x, y: ctx.y}, {entity: opts.entity})
    console.log(
        renderStrata(
            {
                ...view,
                showAll: Boolean(opts.all),
                top: opts.top,
                sort: 'available',
            },
            Boolean(opts.json)
        )
    )
}

function buildDefaultCmd(ctx: CoordContext): Command {
    return new Command('location')
        .description(
            'Show resource summary for a system. Reserves shown are remaining as of the current epoch.'
        )
        .option(
            '--entity <ref>',
            "filter and rank strata by what this entity's gatherer can reach (e.g. ship:1)",
            parseEntityRef
        )
        .option('--all', 'with --entity, also show strata that are out of reach (marked OOD)')
        .option('--top <n>', 'show only the top N strata by available reserve', parseUint32, 10)
        .option('--json', 'emit JSON with full strata data instead of formatted text')
        .action(async (opts: LocationQueryOpts) => {
            await showStrata(ctx, opts)
        })
}

export function register(program: Command): void {
    buildCoordParent(program, async (ctx, remaining) => {
        const cmd = buildDefaultCmd(ctx)
        cmd.exitOverride()
        await cmd.parseAsync(remaining, {from: 'user'})
    })
}
