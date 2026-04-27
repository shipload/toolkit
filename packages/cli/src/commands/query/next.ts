import type {Command} from 'commander'
import {server} from '../../lib/client'
import {type GameState, nextAction} from '../../lib/next'
import {getAccountName} from '../../lib/session'

async function buildState(): Promise<GameState> {
    const target = getAccountName()
    // biome-ignore lint/suspicious/noExplicitAny: readonly responses are loosely typed here
    const playerInfo = (await server.readonly('getplayer', {account: target})) as any
    // biome-ignore lint/suspicious/noExplicitAny: readonly responses are loosely typed here
    const entitiesRes = (await server.readonly('getentities', {owner: target})) as any

    const rawEntities: unknown[] = Array.isArray(entitiesRes)
        ? entitiesRes
        : (entitiesRes?.entities ?? [])

    const entities = rawEntities.map((raw) => {
        // biome-ignore lint/suspicious/noExplicitAny: readonly responses are loosely typed here
        const e = raw as any
        const isIdle = Boolean(e.is_idle)
        const scheduleTasks = e.schedule?.tasks?.length ?? 0
        const completedTasks = isIdle && scheduleTasks > 0 ? Number(scheduleTasks) : 0
        return {
            type: String(e.type ?? e.entity_type ?? 'unknown'),
            id: Number(e.id?.toString?.() ?? e.id ?? 0),
            status: (isIdle ? 'idle' : 'active') as 'idle' | 'active',
            cargoCount: Array.isArray(e.cargo) ? e.cargo.length : 0,
            completedTasks,
        }
    })

    const hasCompany = Boolean(playerInfo?.company_name)
    const inGame = Boolean(playerInfo?.is_player)

    return {
        player:
            hasCompany || inGame
                ? {
                      company: String(playerInfo?.company_name ?? ''),
                      in_game: inGame,
                  }
                : null,
        entities,
    }
}

export function register(program: Command): void {
    program
        .command('next')
        .alias('hint')
        .description('Suggest the next action based on current state')
        .action(async () => {
            const state = await buildState()
            const result = nextAction(state)
            console.log(result.reason)
            console.log(`  → ${result.command}`)
        })
}
