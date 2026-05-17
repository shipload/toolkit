import type {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName} from '../../lib/args'
import {getShipload, server} from '../../lib/client'
import {transact} from '../../lib/session'

interface DrainOptions {
    dryRun?: boolean
}

interface ScheduledRow {
    id: {toString(): string}
    kind?: {toString(): string}
    schedule?: {
        tasks?: unknown[]
    }
}

export async function runDrainSchedules(options: DrainOptions): Promise<void> {
    const shipload = await getShipload()
    let totalDrained = 0
    let pass = 0

    while (true) {
        pass++
        console.log(`pass ${pass}`)
        const stuck: Array<{type: EntityTypeName; id: bigint; reason: string}> = []
        let progressedThisPass = false
        let totalOpenSchedules = 0

        const entityRows = (await server.table('entity').all()) as unknown as ScheduledRow[]
        const allRows: Array<{row: ScheduledRow; type: EntityTypeName}> = entityRows.map((row) => ({
            row,
            type: (row.kind?.toString() ?? 'ship') as EntityTypeName,
        }))

        for (const {row, type} of allRows) {
            const tasks = row.schedule?.tasks
            if (!tasks || tasks.length === 0) continue
            totalOpenSchedules++
            const id = BigInt(row.id.toString())
            if (options.dryRun) {
                console.log(`  ${type}:${id} has ${tasks.length} task(s)`)
                continue
            }
            try {
                const action = shipload.actions.resolve(id)
                await transact({action}, {description: `resolve ${type}:${id}`})
                totalDrained++
                progressedThisPass = true
            } catch (err) {
                const reason = err instanceof Error ? err.message : String(err)
                stuck.push({type, id, reason})
            }
        }

        if (options.dryRun) {
            console.log(
                `\nFound ${totalOpenSchedules} entity(ies) with open schedules across ${ALL_ENTITY_TYPES.join('/')}.`
            )
            break
        }
        if (totalOpenSchedules === 0) {
            console.log('  no entities with open schedules.')
            break
        }
        if (!progressedThisPass) {
            console.log('\nStuck entities (could not resolve):')
            for (const s of stuck) console.log(`  ${s.type}:${s.id} — ${s.reason}`)
            console.log(
                '\nWait for these to become resolvable (e.g., timed travel tasks complete) or investigate.'
            )
            break
        }
    }

    if (!options.dryRun) {
        console.log(`\nTotal resolves: ${totalDrained} across ${pass} pass(es).`)
    }
}

export function registerSubcommand(parent: Command): void {
    parent
        .command('drain-schedules')
        .description('Resolve every entity with an open schedule, until all schedules are empty')
        .addHelpText(
            'before',
            'Operator-only. Use before a contract redeploy that breaks task serialization. ' +
                'Iterates the entity table and calls `resolve` on each entity ' +
                'whose schedule has open tasks, until all schedules are empty or no further progress is possible.\n'
        )
        .option('--dry-run', 'list entities with open schedules without resolving')
        .action(async (opts: DrainOptions) => {
            await runDrainSchedules(opts)
        })
}
