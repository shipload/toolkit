import {describe, expect, test} from 'bun:test'
import {Name, UInt16, UInt32} from '@wharfkit/antelope'
import {ServerContract} from '../src/contracts'
import {cargoItemToStack} from '../src/capabilities/storage'
import {assertProjectionEquals, type ContractProjectedState} from '../src/testing/projection-parity'
import {createProjectedEntity} from '../src/scheduling/projection'

function makeContractState(
    overrides: Partial<ContractProjectedState> = {}
): ContractProjectedState {
    return {
        owner: Name.from('alice'),
        coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
        energy: UInt16.from(100),
        cargomass: UInt32.from(0),
        cargo: [],
        hullmass: UInt32.from(50),
        engines: undefined,
        loaders: undefined,
        generator: undefined,
        capacity: undefined,
        hauler: undefined,
        ...overrides,
    } as ContractProjectedState
}

function makeSdkProjected() {
    return createProjectedEntity({
        coordinates: {x: 0, y: 0},
        energy: UInt16.from(100),
        hullmass: UInt32.from(50),
        cargo: [],
        cargomass: UInt32.from(0),
        owner: Name.from('alice'),
    })
}

describe('assertProjectionEquals', () => {
    test('matching states pass', () => {
        expect(() => assertProjectionEquals(makeContractState(), makeSdkProjected())).not.toThrow()
    })

    test('energy mismatch throws with diagnostic', () => {
        const contract = makeContractState({energy: UInt16.from(80)})
        const sdk = makeSdkProjected()
        expect(() => assertProjectionEquals(contract, sdk, {step: 2})).toThrow(
            /projection divergence at step 2:[\s\S]*energy: contract=80 sdk=100/
        )
    })

    test('cargo merge-order independence', () => {
        const contract = makeContractState({
            cargomass: UInt32.from(5000),
            cargo: [
                ServerContract.Types.cargo_view.from({
                    id: 1,
                    item_id: 301,
                    stats: 0,
                    modules: [],
                    quantity: 3,
                }),
                ServerContract.Types.cargo_view.from({
                    id: 2,
                    item_id: 301,
                    stats: 0,
                    modules: [],
                    quantity: 2,
                }),
            ],
        })
        const sdk = makeSdkProjected()
        sdk.cargo = [
            cargoItemToStack(
                ServerContract.Types.cargo_item.from({
                    item_id: 301,
                    stats: 0,
                    modules: [],
                    quantity: 5,
                })
            ),
        ]
        expect(() => assertProjectionEquals(contract, sdk)).not.toThrow()
    })

    test('multiple mismatches collected into one error', () => {
        const contract = makeContractState({
            energy: UInt16.from(80),
            cargomass: UInt32.from(50),
        })
        const sdk = makeSdkProjected()
        try {
            assertProjectionEquals(contract, sdk)
            throw new Error('expected throw')
        } catch (e) {
            expect(String(e)).toContain('energy: contract=80 sdk=100')
            expect(String(e)).toContain('cargomass: contract=50 sdk=0')
        }
    })

    test('absent-vs-present capability is a mismatch', () => {
        const contract = makeContractState({
            engines: ServerContract.Types.movement_stats.from({thrust: 100, drain: 5}),
        })
        const sdk = makeSdkProjected()
        expect(() => assertProjectionEquals(contract, sdk)).toThrow(/engines/)
    })

    test('present-on-both-with-equal-values passes', () => {
        const engines = ServerContract.Types.movement_stats.from({thrust: 100, drain: 5})
        const contract = makeContractState({engines})
        const sdk = makeSdkProjected()
        sdk.engines = engines
        expect(() => assertProjectionEquals(contract, sdk)).not.toThrow()
    })
})
