import {writeFileSync} from 'node:fs'
import {
    calc_energyusage,
    calc_rechargetime,
    calc_travel_flighttime,
    distanceBetweenPoints,
} from '../src/travel/travel'

const PRECISION = 10000

const coordCases = [
    {ax: 0, ay: 0, bx: 1, by: 0},
    {ax: 0, ay: 0, bx: 3, by: 4},
    {ax: 100, ay: 100, bx: -250, by: 4000},
    {ax: -1500000, ay: 2750000, bx: 1200000, by: -900000},
    {ax: -4000000, ay: -4000000, bx: 4000000, by: 4000000},
]

const engineCases = [
    {thrust: 500, mass: 25000, drain: 40},
    {thrust: 1200, mass: 180000, drain: 15},
    {thrust: 90, mass: 9000, drain: 250},
]

const rechargeCases = [
    {capacity: 1000, energy: 0, recharge: 10},
    {capacity: 1000, energy: 999, recharge: 10},
    {capacity: 1000, energy: 1000, recharge: 10},
    {capacity: 50000, energy: 12345, recharge: 7},
]

const cases: object[] = []
for (const c of coordCases) {
    const distance = Number(distanceBetweenPoints(c.ax, c.ay, c.bx, c.by))
    for (const e of engineCases) {
        const acceleration = (e.thrust / e.mass) * PRECISION
        cases.push({
            ...c,
            ...e,
            distance,
            flight_time: Number(calc_travel_flighttime(distance, acceleration)),
            energy_cost: Number(calc_energyusage(distance, e.drain)),
        })
    }
}

const recharges = rechargeCases.map((r) => ({
    ...r,
    duration: Number(calc_rechargetime(r.capacity, r.energy, r.recharge)),
}))

const out = {travel: cases, recharge: recharges}
writeFileSync(process.argv[2], JSON.stringify(out, null, 2))
console.log(`wrote ${cases.length} travel + ${recharges.length} recharge cases`)
