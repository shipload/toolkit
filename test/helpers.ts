import {assert} from 'chai'
import {AnyInt} from '@wharfkit/antelope'

export function assertEq(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.equal(Number(actual), Number(expected), msg)
}

export function assertAbove(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.isAbove(Number(actual), Number(expected), msg)
}

export function assertAtLeast(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.isAtLeast(Number(actual), Number(expected), msg)
}

export function assertBelow(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.isBelow(Number(actual), Number(expected), msg)
}

export function assertAtMost(actual: AnyInt, expected: AnyInt, msg?: string) {
    assert.isAtMost(Number(actual), Number(expected), msg)
}
