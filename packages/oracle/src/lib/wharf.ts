import {Session} from '@wharfkit/session'
import {WalletPluginPrivateKey} from '@wharfkit/wallet-plugin-privatekey'
import {Shipload} from '@shipload/sdk'

import {env} from './env'

export const shipload = await Shipload.load(env.chain, {
    platformContractName: env.platformAccount,
    serverContractName: env.serverAccount,
})

export const session: Session = new Session({
    chain: env.chain,
    walletPlugin: new WalletPluginPrivateKey(env.privateKey),
    actor: env.accountName,
    permission: env.permissionLevel,
})
