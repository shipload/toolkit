import {expect, test} from 'bun:test'
import type {Coord, SystemGraph} from './route-planner'
import {planRouteWithRetry} from './route-build'

function countingGraph(opts: {
    reachable: boolean
    nearby: (c: Coord) => {coord: Coord; dist: number}[]
}): {graph: SystemGraph; hasSystemCalls: () => number} {
    let calls = 0
    const graph: SystemGraph = {
        hasSystem: () => {
            calls++
            return opts.reachable
        },
        nearby: opts.nearby,
    }
    return {graph, hasSystemCalls: () => calls}
}

test('a route found on the first attempt does not retry', () => {
    const origin: Coord = {x: 0, y: 0}
    const dest: Coord = {x: 3, y: 0}
    const {graph, hasSystemCalls} = countingGraph({reachable: true, nearby: () => []})

    const result = planRouteWithRetry({origin, dest, perLegReach: 5, graph})

    expect(result.ok).toBe(true)
    expect(hasSystemCalls()).toBe(1)
})

test('a no-path result widens the corridor and retries until a route is found', () => {
    const origin: Coord = {x: 0, y: 0}
    const dest: Coord = {x: 100, y: 0}
    const mid: Coord = {x: 50, y: 28.4}
    const perLegReach = 6.4

    const {graph, hasSystemCalls} = countingGraph({
        reachable: true,
        nearby: (c) => {
            if (c.x === origin.x && c.y === origin.y) return [{coord: mid, dist: 0}]
            if (c.x === mid.x && c.y === mid.y) return [{coord: dest, dist: 0}]
            return []
        },
    })

    const result = planRouteWithRetry({origin, dest, perLegReach, graph})

    expect(result.ok).toBe(true)
    // Excluded from the default corridor, found once corridorSlack widens to perLegReach * 3.
    expect(hasSystemCalls()).toBe(2)
})

test('a non-no-path failure returns immediately without retrying', () => {
    const origin: Coord = {x: 0, y: 0}
    const dest: Coord = {x: 100, y: 0}
    const {graph, hasSystemCalls} = countingGraph({reachable: false, nearby: () => []})

    const result = planRouteWithRetry({origin, dest, perLegReach: 5, graph})

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('empty-destination')
    expect(hasSystemCalls()).toBe(1)
})
