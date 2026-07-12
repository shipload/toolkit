import {findNearbyPlanets, PRECISION} from '@shipload/sdk'
import {Name} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {parseEntityRefList, parseInt64} from '../../lib/args'
import {getGameSeed, getShipload} from '../../lib/client'
import {estimateGroupTravel, estimateTravel} from '../../lib/estimate'
import {renderIssues} from '../../lib/feasibility'
import {planRoute, sdkSystemGraph, type Coord} from '@shipload/sdk'
import * as scan from '@shipload/sdk/scan'
import {
    buildHypotheticalSnapshot,
    computeGroupPerLegReach,
    computePerLegReach,
    renderRoutePlan,
    routePlanToJson,
    type LegEstimate,
    type RouteMeta,
} from '../../lib/route-render'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'

interface RouteOptions {
    corridor?: string
    maxLegs?: string
    queue?: boolean
    json?: boolean
}

function nearestSystemHint(seed: Awaited<ReturnType<typeof getGameSeed>>, dest: Coord): string {
    for (const radius of [10, 25, 50]) {
        const hits = findNearbyPlanets(seed, {x: dest.x, y: dest.y}, radius * PRECISION)
        if (hits.length > 0) {
            const sorted = hits
                .map((d) => ({
                    x: Number(d.destination.x),
                    y: Number(d.destination.y),
                    dist: Number(d.distance) / PRECISION,
                }))
                .sort((a, b) => a.dist - b.dist)
            const n = sorted[0]
            return `nearest system is (${n.x},${n.y}), ${n.dist.toFixed(1)} tiles away`
        }
    }
    return 'no system found within 50 tiles'
}

export function register(program: Command): void {
    program
        .command('route')
        .description('Plan an energy-feasible multi-leg travel route for one or more entities')
        .addHelpText(
            'before',
            '\nExamples:\n  route -52 -37 ship:14\n  route -52 -37 ship:14 container:2 --queue\n'
        )
        .argument('<x>', 'destination x', parseInt64)
        .argument('<y>', 'destination y', parseInt64)
        .argument('<entities...>', 'entity refs (type:id); the first is the lead')
        .option('--corridor <tiles>', 'widen the search band when no path is found')
        .option('--max-legs <n>', 'refuse plans longer than this (default 12)')
        .option('--queue', 'submit the travel/recharge chain on-chain')
        .option('--json', 'emit the plan as JSON')
        .action(async (x: bigint, y: bigint, entityArgs: string[], options: RouteOptions) => {
            const entities = parseEntityRefList(entityArgs.join(','))
            const lead = entities[0]
            const isGroup = entities.length > 1
            const entityLabels = entities.map((e) => `${e.entityType}:${e.entityId}`)
            const dest: Coord = {x: Number(x), y: Number(y)}

            const [seed, snapshots] = await Promise.all([
                getGameSeed(),
                Promise.all(entities.map((e) => getEntitySnapshot(e.entityId))),
            ])
            const leadSnapshot = snapshots[0]
            const origin: Coord = {
                x: Number(leadSnapshot.coordinates.x),
                y: Number(leadSnapshot.coordinates.y),
            }

            let perLegReach: number
            try {
                perLegReach = isGroup
                    ? computeGroupPerLegReach(snapshots)
                    : computePerLegReach(leadSnapshot)
            } catch (e) {
                console.error((e as Error).message)
                process.exit(1)
            }

            const plan = planRoute({
                origin,
                dest,
                perLegReach,
                graph: sdkSystemGraph(seed, scan),
                corridorSlack: options.corridor ? Number(options.corridor) : undefined,
                maxLegs: options.maxLegs ? Number(options.maxLegs) : undefined,
            })

            if (!plan.ok) {
                if (plan.reason === 'empty-destination') {
                    console.error(
                        `No system at (${dest.x},${dest.y}); ${nearestSystemHint(seed, dest)}.`
                    )
                } else if (plan.reason === 'no-path') {
                    const f = plan.furthest
                    console.error(
                        `No feasible route within the search band. Furthest reachable toward the target: ${f ? `(${f.x},${f.y})` : 'origin'}. Try --corridor <wider> or a closer destination.`
                    )
                } else {
                    console.error(
                        'Route would exceed --max-legs. Raise the cap or pick a closer destination.'
                    )
                }
                process.exit(1)
            }

            if (isGroup) {
                const firstTarget = plan.waypoints[0]
                const groupCheck = await estimateGroupTravel({
                    entities: entities.map((e) => ({entityId: e.entityId})),
                    target: {x: firstTarget.x, y: firstTarget.y},
                    recharge: true,
                })
                if (!groupCheck.feasibility.ok) {
                    console.error('Group cannot make the first leg:')
                    console.error(renderIssues(groupCheck.feasibility.issues))
                    console.error(
                        'The lead ship likely lacks thrust for the combined mass. Reduce participants or use a stronger lead.'
                    )
                    process.exit(1)
                }
            }

            const capacity = leadSnapshot.generator?.capacity ?? 0n
            let runningEnergy = leadSnapshot.energy ?? capacity
            const legs: LegEstimate[] = []
            for (let i = 0; i < plan.waypoints.length; i++) {
                const from = i === 0 ? origin : plan.waypoints[i - 1]
                const to = plan.waypoints[i]
                const hypo = buildHypotheticalSnapshot(leadSnapshot, from, runningEnergy)
                const est = await estimateTravel({
                    entityId: lead.entityId,
                    target: {x: to.x, y: to.y},
                    recharge: true,
                    snapshot: hypo,
                })
                legs.push({
                    index: i + 1,
                    from,
                    to,
                    distance:
                        est.travel?.distance !== undefined
                            ? est.travel.distance / PRECISION
                            : Math.hypot(to.x - from.x, to.y - from.y),
                    energyUsed: est.travel?.energyCost ?? est.energy_cost,
                    energyCap: Number(capacity),
                    travelSeconds: est.travel?.flightDuration_s ?? est.duration_s,
                    rechargeSeconds: est.travel?.rechargeDuration_s ?? 0,
                })
                runningEnergy =
                    est.travel?.endEnergy !== undefined
                        ? BigInt(Math.max(0, Math.round(est.travel.endEnergy)))
                        : capacity
            }

            const commands = plan.waypoints.map((w) =>
                isGroup
                    ? `shiploadcli grouptravel ${entityLabels.join(',')} ${w.x} ${w.y} --recharge`
                    : `shiploadcli ship ${lead.entityId} travel ${w.x} ${w.y} --recharge`
            )

            const meta: RouteMeta = {
                label: entityLabels.join(' + '),
                origin,
                dest,
                legs: plan.legs,
                totalDistance: plan.totalDistance,
                group: isGroup,
                approxPricing: isGroup,
            }

            if (options.json) {
                console.log(JSON.stringify(routePlanToJson(meta, legs), null, 2))
                return
            }

            console.log(renderRoutePlan(meta, legs, commands))

            if (options.queue) {
                const sl = await getShipload()
                const refs = entities.map((e) => ({
                    entityType: Name.from(e.entityType),
                    entityId: e.entityId,
                }))
                const waypoints = plan.waypoints.map((w) => ({x: w.x, y: w.y}))
                const action = sl.actions.travelplan(refs, waypoints, true)
                await transact(
                    {actions: [action]},
                    {description: `Route ${meta.label} → (${dest.x},${dest.y}) — ${plan.legs} legs`}
                )
            }
        })
}
