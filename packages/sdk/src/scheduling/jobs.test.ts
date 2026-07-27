import {describe, expect, it} from 'bun:test'
import {jobStatus, splitJobCargo} from './jobs'

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
})

describe('splitJobCargo', () => {
    it('takes the last element as output, the rest as inputs', () => {
        const cargo = [{n: 'a'}, {n: 'b'}, {n: 'out'}] as unknown as Parameters<
            typeof splitJobCargo
        >[0]
        const {output, inputs} = splitJobCargo(cargo)
        expect(output).toEqual({n: 'out'} as never)
        expect(inputs).toEqual([{n: 'a'}, {n: 'b'}] as never)
    })
    it('returns null output for empty cargo', () => {
        expect(splitJobCargo([])).toEqual({output: null, inputs: []})
    })
})
