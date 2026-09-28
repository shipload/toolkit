const ORIGINS: Record<string, string> = {
    '73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d':
        'https://dev.shiploadgame.com',
}

export function webappOrigin(chainId: string, override?: string): string | null {
    const origin = override ?? ORIGINS[chainId.toLowerCase()]
    return origin ? origin.replace(/\/+$/, '') : null
}

export function webappSignUrl(chainId: string, payload: string, override?: string): string | null {
    const origin = webappOrigin(chainId, override)
    return origin ? `${origin}/sign/${payload}` : null
}
