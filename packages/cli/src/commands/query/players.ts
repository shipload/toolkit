import type {Command} from 'commander'
import type {PlayerRosterEntry} from '@shipload/sdk'
import {getShipload} from '../../lib/client'
import {formatOutput} from '../../lib/format'

export interface RosterLine {
    owner: string
    company: string | null
}

export function toRosterLines(entries: PlayerRosterEntry[]): RosterLine[] {
    return entries
        .map((entry) => ({owner: entry.owner.toString(), company: entry.company ?? null}))
        .sort((a, b) => a.owner.localeCompare(b.owner))
}

export function renderRoster(lines: RosterLine[]): string {
    const header = `Players (${lines.length}):`
    if (lines.length === 0) return header
    const ownerWidth = Math.max('ACCOUNT'.length, ...lines.map((l) => l.owner.length))
    const out = [header, '', `  ${'ACCOUNT'.padEnd(ownerWidth)}   COMPANY`]
    for (const line of lines) {
        out.push(`  ${line.owner.padEnd(ownerWidth)}   ${line.company ?? '—'}`)
    }
    return out.join('\n')
}

export function register(program: Command): void {
    program
        .command('players')
        .description('List all players in the game, with their company name')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (opts: {json?: boolean}) => {
            const shipload = await getShipload()
            const lines = toRosterLines(await shipload.players.getRoster())
            console.log(formatOutput(lines, {json: Boolean(opts.json)}, renderRoster))
        })
}
