import {CHARTER_REGISTRY, charterEligibleChained, type CharterWorld} from './charters'
import {CHARTER_NONE} from './constants'

export interface BallotVoter {
    account: string
    weight: bigint
    picks: number[]
}

/** Projects a full settlement from scratch; it does not resume an in-flight partial round. */
export interface BallotInput {
    world: CharterWorld
    seats: number
    voters: BallotVoter[]
    picks?: number[]
}

export interface ProjectedSeat {
    nodeId: number
    weight: bigint
}

export interface ProjectedOption {
    nodeId: number
    cost: bigint
    seat: number
    weight: bigint
    rank: number
}

export interface BallotProjection {
    seats: ProjectedSeat[]
    options: ProjectedOption[]
}

function tallyRound(input: BallotInput, seated: number[]): Map<number, bigint> {
    const tallies = new Map<number, bigint>()
    for (const voter of input.voters) {
        for (const pick of voter.picks) {
            const node = CHARTER_REGISTRY.find((n) => n.nodeId === pick)
            if (!node || !charterEligibleChained(input.world, node, seated)) continue
            if (voter.weight > 0n) tallies.set(pick, (tallies.get(pick) ?? 0n) + voter.weight)
            break
        }
    }
    return tallies
}

function leader(tallies: Map<number, bigint>): ProjectedSeat | undefined {
    let winner = CHARTER_NONE
    let best = 0n
    for (const [option, weight] of tallies) {
        if (weight === 0n) continue
        if (winner === CHARTER_NONE || weight > best || (weight === best && option < winner)) {
            best = weight
            winner = option
        }
    }
    return winner === CHARTER_NONE ? undefined : {nodeId: winner, weight: best}
}

export function projectBallot(input: BallotInput): BallotProjection {
    const seats: ProjectedSeat[] = []
    while (seats.length < input.seats) {
        const seat = leader(
            tallyRound(
                input,
                seats.map((s) => s.nodeId)
            )
        )
        if (!seat) break
        seats.push(seat)
    }

    const projected = seats.map((s) => s.nodeId)
    const next = tallyRound(input, projected)
    const picks = input.picks ?? []

    const options: ProjectedOption[] = []
    for (const node of CHARTER_REGISTRY) {
        const seatIndex = projected.indexOf(node.nodeId)
        const option: ProjectedOption = {
            nodeId: node.nodeId,
            cost: node.cost,
            seat: seatIndex + 1,
            weight: 0n,
            rank: picks.indexOf(node.nodeId) + 1,
        }
        if (seatIndex >= 0) {
            option.weight = seats[seatIndex].weight
        } else {
            if (!charterEligibleChained(input.world, node, projected)) continue
            option.weight = next.get(node.nodeId) ?? 0n
        }
        options.push(option)
    }
    return {seats, options}
}
