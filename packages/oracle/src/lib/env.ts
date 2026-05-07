import {Chains} from '@wharfkit/session'

function required(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`${name} is required.`)
    return value
}

const chainName = process.env.CHAIN_NAME || 'Jungle4'
const chain = Chains[chainName as keyof typeof Chains]
if (!chain) throw new Error(`Unknown CHAIN_NAME: ${chainName}`)

export const env = {
    serverAccount: required('SERVER_ACCOUNT'),
    platformAccount: required('PLATFORM_ACCOUNT'),
    accountName: required('ACCOUNT_NAME'),
    permissionLevel: required('PERMISSION_LEVEL'),
    privateKey: required('PRIVATE_KEY'),
    chain,
}
