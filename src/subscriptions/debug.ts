/* eslint-disable no-console */

let enabled = false

export function setSubscriptionsDebug(on: boolean): void {
    enabled = on
}

export function isSubscriptionsDebugEnabled(): boolean {
    return enabled
}

export function debug(...args: unknown[]): void {
    if (enabled) {
        console.log('[WS]', ...args)
    }
}
