import type {EstimateResult} from './estimate'
import {hasIssueWithCode} from './feasibility'

export interface DecideUseRechargeInputs {
    rechargeRequested: boolean
    autoRecharge: boolean
    baseEstimate: EstimateResult
    reestimateWithRecharge: () => Promise<EstimateResult>
}

export async function decideUseRecharge(inputs: DecideUseRechargeInputs): Promise<boolean> {
    if (inputs.rechargeRequested) return true
    if (!inputs.autoRecharge) return false
    if (inputs.baseEstimate.feasibility.ok) return false
    if (!hasIssueWithCode(inputs.baseEstimate.feasibility.issues, 'insufficient_energy')) {
        return false
    }
    const recharged = await inputs.reestimateWithRecharge()
    return recharged.feasibility.ok
}
