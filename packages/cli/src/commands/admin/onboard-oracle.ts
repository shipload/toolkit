import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {gameContractName} from '../../lib/client'
import {addProposeOptions} from '../../lib/msig/options'
import {resolveResponsibility} from '../oracle/admission'
import {buildAddOracle} from './add-oracle'
import {buildUpdateAuth} from './eosio-auth'
import {contractAuthority, readRegistry, reportAbort, runAdminActions} from './index'
import {
    assertAvailableHandle,
    assertPublicKey,
    MembershipAbort,
    ORACLE_PARENT_PERMISSION,
    planOnboard,
    renderOnboardSummary,
} from './membership'

export function buildOnboardActions(handle: string, pubkey: string): Action[] {
    const auth = [contractAuthority()]
    return [
        buildUpdateAuth(
            {
                account: gameContractName,
                permission: handle,
                parent: ORACLE_PARENT_PERMISSION,
                pubkey,
            },
            auth
        ),
        buildAddOracle(handle),
    ]
}

export function register(parent: Command): void {
    const cmd = new Command('onboard-oracle')
        .description('Admit an external oracle: create its handle permission and register it')
        .argument('<handle>', 'oracle handle to admit, from the operator setup block')
        .argument('<public-key>', 'operator public key, from the operator setup block')
        .action(async (handle: string, pubkey: string, _o, command: Command) => {
            console.log('')
            const proposing = Boolean(command.opts().propose)
            let actions: Action[]
            let description: string
            try {
                assertAvailableHandle(handle)
                assertPublicKey(pubkey)
                const snap = await readRegistry(handle)
                const plan = planOnboard(handle, pubkey, snap)
                for (const line of plan.checks) console.log(line)
                actions = plan.sendUpdateAuth
                    ? buildOnboardActions(handle, pubkey)
                    : [buildAddOracle(handle)]
                const verb = proposing ? 'Proposed' : 'Signed'
                description = plan.sendUpdateAuth
                    ? `${verb} updateauth ${handle}, addoracle ${handle}.`
                    : `${verb} addoracle ${handle}.`
            } catch (err) {
                if (err instanceof MembershipAbort) return reportAbort(err)
                throw err
            }
            console.log('')
            const {txid} = await runAdminActions(command, actions, description)
            if (!txid || proposing) return
            const after = await readRegistry(handle)
            const {target, responsible, secondsAway} = await resolveResponsibility(handle)
            console.log(
                renderOnboardSummary({
                    handle,
                    contract: gameContractName,
                    oracles: after.oracles.length,
                    threshold: after.threshold,
                    target,
                    responsible,
                    secondsAway,
                })
            )
        })
    addProposeOptions(cmd)
    parent.addCommand(cmd)
}
