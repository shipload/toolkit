import {expect, test} from 'bun:test'
import {PermissionLevel, PrivateKey} from '@wharfkit/antelope'
import {buildDeleteAuth, buildUpdateAuth} from './eosio-auth'
import {buildOffboardActions} from './offboard-oracle'
import {buildOnboardActions} from './onboard-oracle'
import {
    MembershipAbort,
    type RegistrySnapshot,
    planOffboard,
    planOnboard,
    policyThreshold,
    renderOffboardSummary,
    renderOnboardSummary,
} from './membership'

const KEY = String(PrivateKey.generate('K1').toPublic())
const OTHER_KEY = String(PrivateKey.generate('K1').toPublic())
const AUTH = [PermissionLevel.from('eon.shipload@active')]

function snapshot(over: Partial<RegistrySnapshot> = {}): RegistrySnapshot {
    return {
        contract: 'eon.shipload',
        epoch: 413,
        oracles: ['oracle1', 'oracle2'],
        threshold: 2,
        ...over,
    }
}

function abort(fn: () => unknown): MembershipAbort {
    try {
        fn()
    } catch (err) {
        expect(err).toBeInstanceOf(MembershipAbort)
        return err as MembershipAbort
    }
    throw new Error('expected a MembershipAbort')
}

test('updateauth carries the handle under the oracles parent at threshold 1', () => {
    const action = buildUpdateAuth(
        {
            account: 'eon.shipload',
            permission: 'mycoolnode',
            parent: 'oracles',
            pubkey: KEY,
        },
        AUTH
    )
    expect(String(action.account)).toBe('eosio')
    expect(String(action.name)).toBe('updateauth')
    const data = action.decoded.data
    expect(String(data.account)).toBe('eon.shipload')
    expect(String(data.permission)).toBe('mycoolnode')
    expect(String(data.parent)).toBe('oracles')
    expect(Number(data.auth.threshold)).toBe(1)
    expect(data.auth.keys.length).toBe(1)
    expect(String(data.auth.keys[0].key)).toBe(KEY)
    expect(Number(data.auth.keys[0].weight)).toBe(1)
    expect(data.auth.accounts.length).toBe(0)
    expect(data.auth.waits.length).toBe(0)
})

test('deleteauth names the contract account and the handle', () => {
    const action = buildDeleteAuth({account: 'eon.shipload', permission: 'mycoolnode'}, AUTH)
    expect(String(action.name)).toBe('deleteauth')
    expect(String(action.decoded.data.account)).toBe('eon.shipload')
    expect(String(action.decoded.data.permission)).toBe('mycoolnode')
})

test('a free handle onboards with updateauth and addoracle', () => {
    const plan = planOnboard('mycoolnode', KEY, snapshot())
    expect(plan.sendUpdateAuth).toBe(true)
    expect(plan.checks[0]).toContain('eon.shipload, epoch 413, 2 oracles, threshold 2')
    expect(plan.checks[1]).toContain("'mycoolnode' is free")
    expect(plan.checks[2]).toContain('threshold 2 holds for 3 oracles')
    expect(plan.setThreshold).toBeUndefined()
})

test('the two-thirds policy rounds up and never asks for fewer than two', () => {
    const table: Array<[number, number]> = [
        [1, 1],
        [2, 2],
        [3, 2],
        [4, 3],
        [5, 4],
        [6, 4],
        [7, 5],
        [8, 6],
        [9, 6],
        [10, 7],
    ]
    for (const [oracles, threshold] of table) {
        expect(policyThreshold(oracles)).toBe(threshold)
    }
})

test('onboarding raises the threshold to the policy value and prints the move', () => {
    const plan = planOnboard('mycoolnode', KEY, snapshot({oracles: ['a', 'b', 'c'], threshold: 2}))
    expect(plan.setThreshold).toBe(3)
    expect(plan.checks[2]).toContain('threshold 2 -> 3 for 4 oracles')
})

test('a permission that already carries the same key onboards with addoracle alone', () => {
    const plan = planOnboard('mycoolnode', KEY, snapshot({permissionKeys: [KEY]}))
    expect(plan.sendUpdateAuth).toBe(false)
    expect(plan.checks[1]).toContain('already carries this key')
})

test('onboarding refuses a handle that is already registered', () => {
    const err = abort(() => planOnboard('oracle1', KEY, snapshot()))
    expect(err.line).toContain("'oracle1' is already registered on eon.shipload")
    expect(err.advice).toContain('does not change the key on a live handle')
})

test('onboarding refuses a permission that exists with a different key', () => {
    const err = abort(() => planOnboard('mycoolnode', KEY, snapshot({permissionKeys: [OTHER_KEY]})))
    expect(err.line).toContain('eon.shipload@mycoolnode exists with a different key')
})

test('onboarding refuses the reserved permission names', () => {
    for (const handle of ['owner', 'active', 'oracles']) {
        const err = abort(() => planOnboard(handle, KEY, snapshot()))
        expect(err.advice).toContain(`'${handle}' is not available as an oracle handle`)
    }
})

test('onboarding refuses something that is not a public key', () => {
    const err = abort(() => planOnboard('mycoolnode', 'PUB_K1_xxx', snapshot()))
    expect(err.advice).toContain('is not a public key')
})

test('offboarding sends removeoracle and deleteauth when the threshold still holds', () => {
    const snap = snapshot({oracles: ['oracle1', 'oracle2', 'mycoolnode'], permissionKeys: [KEY]})
    const plan = planOffboard('mycoolnode', snap)
    expect(plan.sendDeleteAuth).toBe(true)
    expect(plan.setThreshold).toBeUndefined()
    expect(plan.checks[1]).toContain('2 oracles remain')
    expect(plan.checks[2]).toContain('threshold 2 holds for 2 oracles')
})

test('offboarding lowers the threshold to the policy value for the remaining oracles', () => {
    const snap = snapshot({oracles: ['a', 'b', 'c', 'mycoolnode'], threshold: 3})
    const plan = planOffboard('mycoolnode', snap)
    expect(plan.setThreshold).toBe(2)
    expect(plan.checks[2]).toContain('threshold 3 -> 2 for 3 oracles')
})

test('offboarding refuses a removal that would leave one oracle', () => {
    const err = abort(() => planOffboard('oracle1', snapshot()))
    expect(err.line).toContain("removing 'oracle1' leaves 1 oracle")
    expect(err.advice).toContain('A quorum needs at least two oracles')
})

test('the two-oracle floor holds even with an explicit threshold', () => {
    const err = abort(() => planOffboard('oracle1', snapshot(), 1))
    expect(err.advice).toContain('A quorum needs at least two oracles')
})

test('offboarding skips deleteauth when the permission is already gone', () => {
    const snap = snapshot({oracles: ['oracle1', 'oracle2', 'mycoolnode']})
    expect(planOffboard('mycoolnode', snap).sendDeleteAuth).toBe(false)
})

test('--set-threshold overrides the policy value in the same transaction', () => {
    const snap = snapshot({oracles: ['oracle1', 'oracle2', 'oracle3'], permissionKeys: [KEY]})
    const plan = planOffboard('oracle1', snap, 1)
    expect(plan.setThreshold).toBe(1)
    expect(plan.sendDeleteAuth).toBe(true)
    expect(plan.checks[1]).toContain('2 oracles remain, threshold set to 1')
})

test('--set-threshold refuses a value the remaining oracles cannot reach', () => {
    const err = abort(() =>
        planOffboard('oracle1', snapshot({oracles: ['oracle1', 'oracle2', 'oracle3']}), 3)
    )
    expect(err.advice).toContain('--set-threshold 3 is not reachable')
})

test('--set-threshold refuses a value below one', () => {
    const err = abort(() =>
        planOffboard('oracle1', snapshot({oracles: ['oracle1', 'oracle2', 'oracle3']}), 0)
    )
    expect(err.advice).toContain('a quorum needs a threshold of at least 1')
})

test('offboarding refuses an unregistered handle', () => {
    const err = abort(() => planOffboard('mycoolnode', snapshot()))
    expect(err.line).toContain("'mycoolnode' is not registered on eon.shipload")
})

test('offboarding refuses to retire the only oracle', () => {
    const err = abort(() => planOffboard('oracle1', snapshot({oracles: ['oracle1'], threshold: 1})))
    expect(err.line).toContain("'oracle1' is the only oracle")
    expect(err.advice).toContain('A quorum needs at least two oracles')
})

test('the onboard summary says which epoch the handle becomes responsible for', () => {
    const out = renderOnboardSummary({
        handle: 'mycoolnode',
        contract: 'eon.shipload',
        oracles: 3,
        threshold: 2,
        target: 413,
        responsible: 414,
        secondsAway: 8040,
    })
    expect(out).toContain('mycoolnode is admitted. Registry: 3 oracles, threshold 2.')
    expect(out).toContain('responsible from epoch 414, about 2h 14m away')
    expect(out).toContain('needs no restart')
})

test('the offboard summary says the handle rides out the epoch already under way', () => {
    const out = renderOffboardSummary({
        handle: 'mycoolnode',
        deletedPermission: true,
        target: 413,
        staysInTarget: true,
    })
    expect(out).toContain('mycoolnode is retired and its permission is deleted.')
    expect(out).toContain("epoch 413's fixed oracle set and drops out from epoch 414")
})

test('onboarding sends setthreshold after addoracle', () => {
    const plan = planOnboard('mycoolnode', KEY, snapshot({oracles: ['a', 'b', 'c'], threshold: 2}))
    const names = buildOnboardActions('mycoolnode', KEY, plan).map((a) => String(a.name))
    expect(names).toEqual(['updateauth', 'addoracle', 'setthreshold'])
})

test('offboarding sends setthreshold before removeoracle', () => {
    const snap = snapshot({
        oracles: ['a', 'b', 'c', 'mycoolnode'],
        threshold: 3,
        permissionKeys: [KEY],
    })
    const plan = planOffboard('mycoolnode', snap)
    const names = buildOffboardActions('mycoolnode', plan).map((a) => String(a.name))
    expect(names).toEqual(['setthreshold', 'removeoracle', 'deleteauth'])
})
