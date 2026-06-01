interface UnicoveNetwork {
    host: string
    slug: string
}

// Chain id → unicove deployment. Subdomain per environment + /<slug>/ path segment,
// matching the format already used by the CLI's explorer links.
const NETWORKS: Record<string, UnicoveNetwork> = {
    '73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d': {
        host: 'jungle4.unicove.com',
        slug: 'jungle4',
    },
    // Mainnet entry added when the game ships, e.g.:
    // 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906': { host: 'unicove.com', slug: 'vaulta' },
}

function networkFor(chainId: string): UnicoveNetwork | undefined {
    return NETWORKS[chainId.toLowerCase()]
}

export function unicoveTransactionUrl(chainId: string, txid: string): string | null {
    const net = networkFor(chainId)
    if (!net) return null
    return `https://${net.host}/en/${net.slug}/transaction/${txid}`
}

export function unicoveProposalUrl(
    chainId: string,
    proposer: string,
    proposalName: string,
): string | null {
    const net = networkFor(chainId)
    if (!net) return null
    return `https://${net.host}/en/${net.slug}/msig/${proposer}/${proposalName}`
}
