import type {APIClient} from '@wharfkit/antelope'
import {client, gameContractName} from '../../lib/client'
import {loadConfig} from '../../lib/config'
import {ValidationError} from '../../lib/validate'

export type ActionNamesLookup = (account: string) => Promise<string[]>

export function chainActionNames(apiClient: APIClient = client): ActionNamesLookup {
    return async (account) => {
        const {abi} = await apiClient.v1.chain.get_abi(account)
        return (abi?.actions ?? []).map((a) => String(a.name))
    }
}

let checked: Promise<void> | null = null

export async function assertSandbox(
    account: string,
    lookup: ActionNamesLookup,
    source: string
): Promise<void> {
    const names = await lookup(account)
    if (names.includes('sbspawn')) return
    throw new ValidationError(
        `${account} is not a Sandbox server: its contract has no sandbox acts. Nothing was sent.`,
        `PLAYER_CONFIG=<path to a Sandbox profile> shiploadcli sandbox ... (active config: ${source}; see config.sandbox.ini.example)`
    )
}

export function requireSandbox(): Promise<void> {
    if (!checked) {
        checked = assertSandbox(gameContractName, chainActionNames(), loadConfig().source)
    }
    return checked
}
