import {expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {build} from '../src/cli'

test('CLI builds with one workshop command and exposes oracle collection controls', () => {
    const program = build()
    expect(program.commands.filter((command) => command.name() === 'workshop')).toHaveLength(1)
    const oracle = program.commands.find((command) => command.name() === 'oracle')
    const tick = oracle?.commands.find((command) => command.name() === 'tick')
    expect(tick?.options.some((option) => option.long === '--collect')).toBe(true)
    const run = oracle?.commands.find((command) => command.name() === 'run')
    expect(run?.options.find((option) => option.long === '--collect-interval')?.defaultValue).toBe(
        '21600'
    )
})

function runCli(args: string[], env: Record<string, string>) {
    return Bun.spawnSync(['bun', 'src/index.ts', ...args], {
        cwd: join(import.meta.dir, '..'),
        env: {...process.env, ...env},
    })
}

test('a missing $PLAYER_CONFIG stops contract commands but not --help', () => {
    const missing = join(tmpdir(), 'shipload-missing-profile', 'config.ini')
    const status = runCli(['oracle', 'status'], {PLAYER_CONFIG: missing})
    expect(status.exitCode).not.toBe(0)
    expect(status.stderr.toString()).toContain(missing)
    expect(status.stdout.toString()).not.toContain('eon.shipload')

    const help = runCli(['--help'], {PLAYER_CONFIG: missing})
    expect(help.exitCode).toBe(0)
    expect(help.stdout.toString()).toContain('shiploadcli')
})
