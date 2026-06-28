import {SCAN_WASM_B64} from './scan-wasm.base64'

const stubImports: WebAssembly.Imports = new Proxy(
    {},
    {
        get: () => new Proxy({}, {get: () => () => 0}),
    }
) as any

let inst: WebAssembly.Instance | null = null
let readyPromise: Promise<void> | null = null

function bytes(): Uint8Array {
    return Uint8Array.from(atob(SCAN_WASM_B64), (c) => c.charCodeAt(0))
}

function finish(i: WebAssembly.Instance) {
    const ex = i.exports as any
    if (typeof ex._initialize === 'function') ex._initialize()
    inst = i
}

export function scanReady(): Promise<void> {
    if (inst) return Promise.resolve()
    if (!readyPromise)
        readyPromise = (
            WebAssembly.instantiate(bytes().buffer as ArrayBuffer, stubImports) as Promise<{
                instance: WebAssembly.Instance
            }>
        ).then((r) => finish(r.instance))
    return readyPromise
}

function ex(): any {
    if (!inst)
        finish(
            new WebAssembly.Instance(
                new WebAssembly.Module(bytes().buffer as ArrayBuffer),
                stubImports
            )
        )
    return inst!.exports
}

const hex = (h: string) => Uint8Array.from(h.match(/../g)!.map((b) => parseInt(b, 16)))

export function getLocationType(gameSeed: string, x: number, y: number): number {
    const e = ex()
    const mem = e.memory as WebAssembly.Memory
    const g = e.malloc(32)
    new Uint8Array(mem.buffer, g, 32).set(hex(gameSeed))
    const t = e.get_location_type(g, BigInt(x), BigInt(y))
    e.free(g)
    return t
}

export interface SystemCell {
    x: number
    y: number
    locType: number
}

export interface Coord {
    x: number
    y: number
}

export interface Deposit {
    x: number
    y: number
    depth: number
    itemId: number
    richness: number
    reserve: number
    stats: [number, number, number]
}

export interface DerivedCell {
    location: {x: number; y: number; locType: number; subtype: number; size: number}
    deposits: Deposit[]
}

export function systemsInBox(
    gameSeed: string,
    xMin: number,
    yMin: number,
    xMax: number,
    yMax: number
): SystemCell[] {
    const e = ex()
    const mem = e.memory as WebAssembly.Memory
    const g = e.malloc(32)
    new Uint8Array(mem.buffer, g, 32).set(hex(gameSeed))
    let cap = 256
    let out = e.malloc(cap * 12)
    let n = e.systems_in_box(g, xMin, yMin, xMax, yMax, out, cap)
    if (n < 0) {
        e.free(out)
        cap = -n
        out = e.malloc(cap * 12)
        n = e.systems_in_box(g, xMin, yMin, xMax, yMax, out, cap)
    }
    const res: SystemCell[] = []
    const dv = new DataView(mem.buffer.slice(out, out + n * 12))
    for (let i = 0; i < n; i++) {
        const o = i * 12
        res.push({
            x: dv.getInt32(o, true),
            y: dv.getInt32(o + 4, true),
            locType: dv.getUint32(o + 8, true),
        })
    }
    e.free(g)
    e.free(out)
    return res
}

export interface LocationCell {
    x: number
    y: number
    locType: number
    subtype: number
    size: number
}

export function locationsInBox(
    gameSeed: string,
    xMin: number,
    yMin: number,
    xMax: number,
    yMax: number
): LocationCell[] {
    const e = ex()
    const mem = e.memory as WebAssembly.Memory
    const g = e.malloc(32)
    new Uint8Array(mem.buffer, g, 32).set(hex(gameSeed))
    let cap = 256
    let out = e.malloc(cap * 16)
    let n = e.locations_in_box(g, xMin, yMin, xMax, yMax, out, cap)
    if (n < 0) {
        e.free(out)
        cap = -n
        out = e.malloc(cap * 16)
        n = e.locations_in_box(g, xMin, yMin, xMax, yMax, out, cap)
    }
    const res: LocationCell[] = []
    const dv = new DataView(mem.buffer.slice(out, out + n * 16))
    for (let i = 0; i < n; i++) {
        const o = i * 16
        res.push({
            x: dv.getInt32(o, true),
            y: dv.getInt32(o + 4, true),
            locType: dv.getUint8(o + 8),
            subtype: dv.getUint8(o + 9),
            size: dv.getUint32(o + 12, true),
        })
    }
    e.free(g)
    e.free(out)
    return res
}

export interface WormholeCell {
    x: number
    y: number
    exit: {x: number; y: number}
}

export function wormholesInBox(
    gameSeed: string,
    xMin: number,
    yMin: number,
    xMax: number,
    yMax: number
): WormholeCell[] {
    const e = ex()
    const mem = e.memory as WebAssembly.Memory
    const g = e.malloc(32)
    new Uint8Array(mem.buffer, g, 32).set(hex(gameSeed))
    let cap = 256
    let out = e.malloc(cap * 16)
    let n = e.wormholes_in_box(g, xMin, yMin, xMax, yMax, out, cap)
    if (n < 0) {
        e.free(out)
        cap = -n
        out = e.malloc(cap * 16)
        n = e.wormholes_in_box(g, xMin, yMin, xMax, yMax, out, cap)
    }
    const res: WormholeCell[] = []
    const dv = new DataView(mem.buffer.slice(out, out + n * 16))
    for (let i = 0; i < n; i++) {
        const o = i * 16
        res.push({
            x: dv.getInt32(o, true),
            y: dv.getInt32(o + 4, true),
            exit: {x: dv.getInt32(o + 8, true), y: dv.getInt32(o + 12, true)},
        })
    }
    e.free(g)
    e.free(out)
    return res
}

export async function scanCells(
    gameSeed: string,
    epochSeed: string,
    cells: Coord[]
): Promise<DerivedCell[]> {
    await scanReady()
    return scanCellsCore(gameSeed, epochSeed, cells)
}

// Sync sibling of scanCells; caller must warm the instance via scanReady() first.
export function scanCellsSync(gameSeed: string, epochSeed: string, cells: Coord[]): DerivedCell[] {
    return scanCellsCore(gameSeed, epochSeed, cells)
}

function scanCellsCore(gameSeed: string, epochSeed: string, cells: Coord[]): DerivedCell[] {
    const e = ex()
    const mem = e.memory as WebAssembly.Memory
    const write = (b: Uint8Array) => {
        const p = e.malloc(b.length)
        new Uint8Array(mem.buffer, p, b.length).set(b)
        return p
    }
    const gp = write(hex(gameSeed))
    const ep = write(hex(epochSeed))
    const cellArr = new Int32Array(cells.length * 2)
    cells.forEach((c, i) => {
        cellArr[i * 2] = c.x
        cellArr[i * 2 + 1] = c.y
    })
    const cp = write(new Uint8Array(cellArr.buffer))
    const locOut = e.malloc(cells.length * 8)
    let cap = Math.max(64, cells.length * 8)
    let depOut = e.malloc(cap * 40)
    let n = e.scan_cells(gp, ep, cp, cells.length, locOut, depOut, cap)
    if (n < 0) {
        e.free(depOut)
        cap = -n
        depOut = e.malloc(cap * 40)
        n = e.scan_cells(gp, ep, cp, cells.length, locOut, depOut, cap)
    }
    const locView = new DataView(mem.buffer.slice(locOut, locOut + cells.length * 8))
    const depView = new DataView(mem.buffer.slice(depOut, depOut + n * 40))
    for (const p of [gp, ep, cp, locOut, depOut]) e.free(p)
    const out: DerivedCell[] = cells.map((c, i) => ({
        location: {
            x: c.x,
            y: c.y,
            locType: locView.getUint8(i * 8),
            subtype: locView.getUint8(i * 8 + 1),
            size: locView.getUint32(i * 8 + 4, true),
        },
        deposits: [],
    }))
    for (let i = 0; i < n; i++) {
        const o = i * 40
        const ci = depView.getUint32(o, true)
        out[ci].deposits.push({
            x: cells[ci].x,
            y: cells[ci].y,
            depth: depView.getUint32(o + 4, true),
            itemId: depView.getUint32(o + 8, true),
            richness: depView.getUint32(o + 12, true),
            reserve: depView.getFloat64(o + 32, true),
            stats: [
                depView.getUint32(o + 16, true),
                depView.getUint32(o + 20, true),
                depView.getUint32(o + 24, true),
            ],
        })
    }
    return out
}
