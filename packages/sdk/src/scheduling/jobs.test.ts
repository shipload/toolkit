import {describe, expect, it} from 'bun:test'
import {jobStatus, jobStatusLabel, splitJobCargo} from './jobs'

const at = (s: string) => new Date(s)

describe('jobStatus', () => {
    const job = {startsAt: at('2026-07-26T10:00:00Z'), completesAt: at('2026-07-26T11:00:00Z')}
    it('is waiting before startsAt', () => {
        expect(jobStatus(job, at('2026-07-26T09:59:59Z'))).toBe('waiting')
    })
    it('is crafting between startsAt and completesAt', () => {
        expect(jobStatus(job, at('2026-07-26T10:30:00Z'))).toBe('crafting')
    })
    it('is ready at or after completesAt', () => {
        expect(jobStatus(job, at('2026-07-26T11:00:00Z'))).toBe('ready')
        expect(jobStatus(job, at('2026-07-26T12:00:00Z'))).toBe('ready')
    })
    it('is inline while the drop-off is still in the air', () => {
        const booked = {
            startsAt: at('1970-01-01T00:00:00Z'),
            completesAt: at('1970-01-01T00:00:00Z'),
        }
        expect(jobStatus({...booked, deposited: false}, at('2026-07-26T10:00:00Z'))).toBe('inline')
        expect(jobStatus({...job, deposited: true}, at('2026-07-26T10:30:00Z'))).toBe('crafting')
    })
    it('labels every state', () => {
        expect(jobStatusLabel('inline')).toBe('In Line')
        expect(jobStatusLabel('ready')).toBe('Ready for Pickup')
    })
})

describe('splitJobCargo', () => {
    it('reads an In Line row as inputs with no output', () => {
        const cargo = [{n: 'a'}, {n: 'b'}] as unknown as Parameters<typeof splitJobCargo>[0]
        const {output, inputs} = splitJobCargo(cargo, false)
        expect(output).toBeNull()
        expect(inputs).toEqual([{n: 'a'}, {n: 'b'}] as never)
    })
    it('reads a landed row as the output with no inputs', () => {
        const cargo = [{n: 'out'}] as unknown as Parameters<typeof splitJobCargo>[0]
        const {output, inputs} = splitJobCargo(cargo, true)
        expect(output).toEqual({n: 'out'} as never)
        expect(inputs).toEqual([] as never)
    })
    it('returns null output for empty cargo', () => {
        expect(splitJobCargo([], true)).toEqual({output: null, inputs: []})
        expect(splitJobCargo([], false)).toEqual({output: null, inputs: []})
    })
})
