export interface ClusterOccupant {
    gx: number
    gy: number
    entityId: number
    label: string
}

export interface ClusterGridInput {
    hub: {id: number; label: string; x: number; y: number}
    footprint: {gx: number; gy: number}[]
    occupants: ClusterOccupant[]
}

export function glyphForLabel(label: string): string {
    const words = label.trim().split(/\s+/)
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
    }
    const two = label.trim().slice(0, 2)
    return two.charAt(0).toUpperCase() + two.slice(1)
}

const CELL_W = 4

function cell(text: string): string {
    return text.padStart(2).padEnd(CELL_W)
}

export function formatClusterGrid(input: ClusterGridInput): string {
    const {hub, footprint, occupants} = input
    const key = (gx: number, gy: number) => `${gx},${gy}`
    const inFootprint = new Set(footprint.map((c) => key(c.gx, c.gy)))
    const byCell = new Map(occupants.map((o) => [key(o.gx, o.gy), o]))

    const xs = footprint.map((c) => c.gx)
    const ys = footprint.map((c) => c.gy)
    const minX = Math.min(...xs, 0)
    const maxX = Math.max(...xs, 0)
    const minY = Math.min(...ys, 0)
    const maxY = Math.max(...ys, 0)

    const lines: string[] = []
    lines.push(`Hub #${hub.id}  (${hub.label})  @ (${hub.x}, ${hub.y})`)
    const free = footprint.filter((c) => !byCell.has(key(c.gx, c.gy)))
    lines.push(`Footprint ${footprint.length} cells · ${occupants.length} occupied · ${free.length} free`)
    lines.push('')

    const header =
        ' '.repeat(6) + Array.from({length: maxX - minX + 1}, (_, i) => cell(String(minX + i))).join('')
    lines.push(header)

    for (let gy = minY; gy <= maxY; gy++) {
        let row = String(gy).padStart(4) + '  '
        for (let gx = minX; gx <= maxX; gx++) {
            if (gx === 0 && gy === 0) {
                row += cell('(H)')
            } else {
                const occ = byCell.get(key(gx, gy))
                if (occ) row += cell(glyphForLabel(occ.label))
                else if (inFootprint.has(key(gx, gy))) row += cell('·')
                else row += cell('')
            }
        }
        lines.push(row.trimEnd())
    }

    lines.push('')
    const legend = [`(H) ${hub.label}#${hub.id}`]
    for (const o of occupants) legend.push(`${glyphForLabel(o.label)} ${o.label}#${o.entityId}`)
    legend.push('· free')
    lines.push('  ' + legend.join('   '))

    lines.push('')
    lines.push('  free: ' + free.map((c) => `(${c.gx},${c.gy})`).join(' '))

    return lines.join('\n')
}
