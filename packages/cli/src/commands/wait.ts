import {type Command, Option} from 'commander'
import {SubscriptionsManager, type ServerTypes} from '@shipload/sdk'
import type {WaitFleetResult} from '../lib/wait-fleet'
import {renderEntityFull} from '../lib/entity-header'
import {renderSummaries} from './query/entities'
import {parseEntityType, type EntityTypeName} from '../lib/args'
import {loadConfig} from '../lib/config'
import {entityInfoToSnapshot, getEntitySnapshot} from '../lib/snapshot'
import {ensureNoPendingResolve} from '../lib/resolve-prompt'
import {streamFleetSnapshots, type FleetSubscribeManager} from '../lib/snapshot-fleet'
import {getAccountName} from '../lib/session'
import {withValidation} from '../lib/errors'
import {TIMEOUT_OPTION} from '../lib/wait'
import {waitForFleetAvailable} from '../lib/wait-fleet'

export function renderWaitText(owner: string, result: WaitFleetResult): string {
    if (result.mode === 'first') {
        const m = result.matched[0]
        const header = `Ready: ${m.type} ${m.id}${m.entity_name ? ` — ${m.entity_name}` : ''}`
        const body = renderEntityFull(m as unknown as ServerTypes.entity_info)
        return `${header}\n${body}`
    }
    const header = `All ${result.matched.length} entities ready (${owner})`
    const summaryRows = result.matched.map((s) => ({
        type: String(s.type),
        id: BigInt(s.id.toString()),
        entity_name: s.entity_name,
        is_idle: s.is_idle,
        resolved_count: s.schedule?.tasks.length ?? 0,
        pending_count: s.pending_tasks?.length ?? 0,
    }))
    return `${header}\n${renderSummaries(owner, summaryRows as never)}`
}

export function renderWaitJson(owner: string, result: WaitFleetResult): unknown {
    if (result.mode === 'first') {
        return {
            mode: 'first',
            owner,
            matched: result.matched[0],
            cohort_size: result.cohortSize,
        }
    }
    return {
        mode: 'all',
        owner,
        matched: result.matched,
        cohort_size: result.cohortSize,
    }
}

function wsUrlFromIndexer(httpUrl: string): string {
    const trimmed = httpUrl.trim().replace(/\/+$/, '')
    return `${trimmed.replace(/^http/i, 'ws')}/v1/shipload/stream`
}

interface WaitCliOptions {
    type?: EntityTypeName
    all?: boolean
    autoResolve?: boolean
    timeout?: number
    json?: boolean
}

export async function runWait(ownerArg: string | undefined, opts: WaitCliOptions): Promise<void> {
    const cfg = loadConfig()
    if (!cfg.indexerUrl) {
        throw new Error(
            `Missing [indexer] url in config.ini at ${cfg.source}; required for shiploadcli wait.`
        )
    }
    const owner = ownerArg ?? getAccountName()
    const wsUrl = wsUrlFromIndexer(cfg.indexerUrl)
    const sdkManager = new SubscriptionsManager({url: wsUrl})

    const adapter: FleetSubscribeManager = {
        subscribeOwner: (ownerName, handlers) => {
            const handle = sdkManager.subscribeOwner(ownerName, {
                onSnapshot: (entities) =>
                    handlers.onSnapshot?.(
                        entities.map((e) => entityInfoToSnapshot(e as ServerTypes.entity_info))
                    ),
                onUpdate: (entity) =>
                    handlers.onUpdate?.(entityInfoToSnapshot(entity as ServerTypes.entity_info)),
            })
            handlers.onConnectionState?.('live')
            return {subId: handle.subId, unsubscribe: () => handle.unsubscribe()}
        },
    }

    const stream = streamFleetSnapshots({owner, type: opts.type}, {manager: adapter})

    try {
        const result = await waitForFleetAvailable({
            stream,
            mode: opts.all ? 'all' : 'first',
            autoResolve: opts.autoResolve !== false,
            quiet: !!opts.json,
            owner,
            typeFilter: opts.type,
            timeoutMs: opts.timeout,
            resolveFn: (t, i, c, a, o) => ensureNoPendingResolve(t, i, c, a, o ?? {}),
            fetchSnapshot: getEntitySnapshot,
        })

        if (opts.json) {
            console.log(JSON.stringify(renderWaitJson(owner, result), null, 2))
        } else {
            console.log(renderWaitText(owner, result))
        }
    } finally {
        sdkManager.close()
    }
}

export function register(program: Command): void {
    program
        .command('wait')
        .description(
            'Block until any owned action-capable entity (one with installed modules) becomes available — idle with no pending or unresolved tasks. Use --all to wait for every such entity.'
        )
        .argument('[owner]', 'account name (defaults to self)')
        .option('--type <t>', 'filter by entity type (ship/warehouse)', parseEntityType)
        .addOption(new Option('--all', 'wait until every action-capable entity is available'))
        .addOption(
            new Option(
                '--auto-resolve',
                'auto-resolve completed tasks before exit (default: on; use --no-auto-resolve to disable)'
            )
        )
        .addOption(TIMEOUT_OPTION)
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (ownerArg: string | undefined, opts: WaitCliOptions) => {
            await withValidation(() => runWait(ownerArg, opts))
        })
}
