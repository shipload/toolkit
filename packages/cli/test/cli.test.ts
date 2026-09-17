import {expect, test} from 'bun:test'
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
