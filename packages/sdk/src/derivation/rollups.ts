import {UInt8, UInt16, UInt32} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'

export function rollupGatherer(
    lanes: ServerContract.Types.gatherer_lane[]
): {yield: UInt16; drain: UInt32; depth: UInt16} | undefined {
    if (lanes.length === 0) return undefined
    let totalYield = 0
    let totalDrain = 0
    let maxDepth = 0
    for (const l of lanes) {
        totalYield += Number(l.yield)
        totalDrain += Number(l.drain)
        const d = Number(l.depth)
        if (d > maxDepth) maxDepth = d
    }
    return {
        yield: UInt16.from(Math.min(totalYield, 65535)),
        drain: UInt32.from(totalDrain),
        depth: UInt16.from(maxDepth),
    }
}

export function rollupCrafter(
    lanes: ServerContract.Types.crafter_lane[]
): {speed: UInt16; drain: UInt32} | undefined {
    if (lanes.length === 0) return undefined
    let totalSpeed = 0
    let totalDrain = 0
    for (const l of lanes) {
        totalSpeed += Number(l.speed)
        totalDrain += Number(l.drain)
    }
    return {
        speed: UInt16.from(Math.min(totalSpeed, 65535)),
        drain: UInt32.from(totalDrain),
    }
}

export function rollupBuilder(
    lanes: ServerContract.Types.builder_lane[]
): {speed: UInt16; drain: UInt32} | undefined {
    if (lanes.length === 0) return undefined
    let totalSpeed = 0
    let totalDrain = 0
    for (const l of lanes) {
        totalSpeed += Number(l.speed)
        totalDrain += Number(l.drain)
    }
    return {
        speed: UInt16.from(Math.min(totalSpeed, 65535)),
        drain: UInt32.from(totalDrain),
    }
}

export function rollupLoaders(
    lanes: ServerContract.Types.loader_lane[]
): {mass: UInt32; thrust: UInt16; quantity: UInt8} | undefined {
    if (lanes.length === 0) return undefined
    const count = lanes.length
    let totalMass = 0
    let totalThrust = 0
    for (const l of lanes) {
        totalMass += Number(l.mass)
        totalThrust += Number(l.thrust)
    }
    return {
        mass: UInt32.from(Math.floor(totalMass / count)),
        thrust: UInt16.from(Math.min(totalThrust, 65535)),
        quantity: UInt8.from(count),
    }
}
