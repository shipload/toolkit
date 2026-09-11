import {expect, test} from 'bun:test'
import {classifyCloseRace, classifyCommitRace, classifyRevealRace, errorMessages} from './race'

function apiError(message: string): unknown {
    return {
        message: `assertion failure with message: ${message}`,
        response: {
            json: {error: {what: 'eosio_assert_message assertion failure', details: [{message}]}},
        },
    }
}

test('errorMessages reads the message, the details and the chain body', () => {
    const msgs = errorMessages(apiError('Epoch already finalized.'))
    expect(msgs.some((m) => m.includes('Epoch already finalized.'))).toBe(true)
})

test('errorMessages tolerates a bare string and a shapeless object', () => {
    expect(errorMessages('boom')).toEqual(['boom'])
    expect(errorMessages({})).toEqual([])
    expect(errorMessages(undefined)).toEqual([])
})

test('classifyRevealRace matches only the finalized assert', () => {
    expect(classifyRevealRace(apiError('Epoch already finalized.'))).toBe('epoch-finalized')
    expect(classifyRevealRace(apiError('Reveal pre-image does not match commit.'))).toBeNull()
})

test('classifyCommitRace separates a shut window from a rolled epoch', () => {
    expect(
        classifyCommitRace(
            apiError('Commit window closed: a reveal for this epoch has already been submitted.')
        )
    ).toBe('window-closed')
    expect(classifyCommitRace(apiError('Commit must target next epoch (state.epoch + 1).'))).toBe(
        'epoch-closed'
    )
    expect(classifyCommitRace(apiError('Oracle not in epoch responsible set.'))).toBeNull()
})

test('classifyCloseRace covers both ways another oracle can get there first', () => {
    expect(classifyCloseRace(apiError('Epoch already finalized.'))).toBe('raced')
    expect(
        classifyCloseRace(apiError('closeepoch targets the epoch the game is waiting on.'))
    ).toBe('raced')
    expect(classifyCloseRace(apiError('Epoch deadline has not passed.'))).toBeNull()
})
