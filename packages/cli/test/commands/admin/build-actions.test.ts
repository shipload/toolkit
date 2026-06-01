import {expect, test} from 'bun:test'
import {buildAddOracle} from '../../../src/commands/admin/add-oracle'
import {buildSetThreshold} from '../../../src/commands/admin/set-threshold'
import {buildSetWrapCost} from '../../../src/commands/admin/set-wrap-cost'
import {buildSetWrapFee} from '../../../src/commands/admin/set-wrap-fee'

test('add-oracle builds an addoracle action authorized by the contract', () => {
    const action = buildAddOracle('oracle.aa')
    expect(action.account.toString()).toBe('eon.shipload')
    expect(action.name.toString()).toBe('addoracle')
    expect(action.authorization[0].toString()).toBe('eon.shipload@active')
})

test('set-threshold builds a setthreshold action', () => {
    const action = buildSetThreshold(2)
    expect(action.name.toString()).toBe('setthreshold')
    expect(action.authorization[0].toString()).toBe('eon.shipload@active')
})

test('set-wrap-cost builds a setwrapcost action', () => {
    const action = buildSetWrapCost(1, 3, 1000n)
    expect(action.name.toString()).toBe('setwrapcost')
    expect(action.authorization[0].toString()).toBe('eon.shipload@active')
})

test('set-wrap-fee builds a setwrapfee action', () => {
    const action = buildSetWrapFee(250, 'fee.account')
    expect(action.name.toString()).toBe('setwrapfee')
    expect(action.authorization[0].toString()).toBe('eon.shipload@active')
})
