import type {Command} from 'commander'
import * as find from './find'
import * as scan from './scan'
import * as restore from './restore'
import * as snapshot from './snapshot'
import * as tuiSelftest from './tui-selftest'
import * as verifyTiers from './verify-tiers'

export function register(program: Command): void {
    const tools = program.command('tools').description('Diagnostic and analysis tools')
    scan.registerSubcommand(tools)
    find.registerSubcommand(tools)
    restore.registerSubcommand(tools)
    snapshot.registerSubcommand(tools)
    verifyTiers.registerSubcommand(tools)
    tuiSelftest.registerSubcommand(tools)
}
