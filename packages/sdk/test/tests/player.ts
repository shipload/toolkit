import {assert} from 'chai'
import {Player} from 'src/entities/player'

suite('Player', () => {
    suite('fromState', () => {
        test('creates player from state input', () => {
            const player = Player.fromState({owner: 'testplayer'})
            assert.equal(player.owner.toString(), 'testplayer')
        })
    })

    suite('from', () => {
        test('creates player from row data', () => {
            const player = Player.from({owner: 'testplayer'})
            assert.equal(player.owner.toString(), 'testplayer')
        })
    })
})
