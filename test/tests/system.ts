import assert from 'assert'
import {Checksum256} from '@wharfkit/antelope'
import Shipload, {getSystemName} from '$lib'
import {Chains} from '@wharfkit/session'
import {makeClient} from '@wharfkit/mock-data'

const client = makeClient('https://jungle4.greymass.com')
const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

suite('getSystemName', function () {
    let shipload: Shipload
    let gameSeed: Checksum256

    setup(async () => {
        shipload = await Shipload.load(Chains.Jungle4, {
            client,
            platformContractName,
            serverContractName,
        })
        const game = await shipload.getGame()
        gameSeed = game.config.seed
    })
    test('should throw an error if system does not exist', function () {
        const locationWithNoPlanet = {x: 0, y: 2}

        assert.throws(
            () => getSystemName(gameSeed, locationWithNoPlanet),
            /System doesn't exist at location/,
            'Expected an error when the system does not exist'
        )
    })

    test('generate name at 0,0', function () {
        const generatedName = getSystemName(gameSeed, {x: 0, y: 0})
        assert.equal(generatedName, 'Gilila')
    })

    test('generate name at 0,1', function () {
        const generatedName = getSystemName(gameSeed, {x: 0, y: 1})
        assert.equal(generatedName, 'Cencaelgru')
    })
})
