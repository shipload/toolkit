import {Shipload} from '@shipload/sdk'
import {chain, client} from '../../src/lib/client'

let cached: Shipload | null = null

export function getLocalShipload(): Shipload {
    if (!cached) {
        cached = new Shipload(chain, {client})
    }
    return cached
}
