import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {parseUint8} from '../../lib/args'
import {gameContractName} from '../../lib/client'
import {addProposeOptions} from '../../lib/msig/options'
import {resolveResponsibility} from '../oracle/admission'
import {buildDeleteAuth} from './eosio-auth'
import {contractAuthority, readRegistry, reportAbort, runAdminActions} from './index'
import {MembershipAbort, type OffboardPlan, planOffboard, renderOffboardSummary} from './membership'
import {buildRemoveOracle} from './remove-oracle'
import {buildSetThreshold} from './set-threshold'

export function buildOffboardActions(handle: string, plan: OffboardPlan): Action[] {
    const actions: Action[] = []
    if (plan.setThreshold !== undefined) actions.push(buildSetThreshold(plan.setThreshold))
    actions.push(buildRemoveOracle(handle))
    if (plan.sendDeleteAuth) {
        actions.push(
            buildDeleteAuth({account: gameContractName, permission: handle}, [contractAuthority()])
        )
    }
    return actions
}

function describe(handle: string, plan: OffboardPlan, proposing: boolean): string {
    const names = [`removeoracle ${handle}`]
    if (plan.setThreshold !== undefined) names.unshift(`setthreshold ${plan.setThreshold}`)
    if (plan.sendDeleteAuth) names.push(`deleteauth ${handle}`)
    const verb = proposing ? 'Proposed' : 'Signed'
    return `${verb} ${names.join(', ')}.`
}

export function register(parent: Command): void {
    const cmd = new Command('offboard-oracle')
        .description('Retire an oracle: unregister it and delete its handle permission')
        .argument('<handle>', 'oracle handle to retire')
        .option(
            '--set-threshold <m>',
            'threshold to leave the quorum at, overriding the two-thirds policy value',
            parseUint8
        )
        .action(async (handle: string, opts: {setThreshold?: number}, command: Command) => {
            console.log('')
            const proposing = Boolean(command.opts().propose)
            let actions: Action[]
            let description: string
            let staysInTarget = false
            let target = 0
            try {
                const snap = await readRegistry(handle)
                const plan = planOffboard(handle, snap, opts.setThreshold)
                for (const line of plan.checks) console.log(line)
                actions = buildOffboardActions(handle, plan)
                description = describe(handle, plan, proposing)
                const responsibility = await resolveResponsibility(handle)
                target = responsibility.target
                staysInTarget = responsibility.responsible === responsibility.target
            } catch (err) {
                if (err instanceof MembershipAbort) return reportAbort(err)
                throw err
            }
            console.log('')
            const {txid} = await runAdminActions(command, actions, description)
            if (!txid || proposing) return
            console.log(
                renderOffboardSummary({
                    handle,
                    deletedPermission: description.includes('deleteauth'),
                    target,
                    staysInTarget,
                })
            )
        })
    addProposeOptions(cmd)
    parent.addCommand(cmd)
}
