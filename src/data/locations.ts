export interface PlanetSubtypeInfo {
    id: number
    label: string
    description: string
    paletteType: string
}

const planetSubtypes: PlanetSubtypeInfo[] = [
    {
        id: 0,
        label: 'Gas Giant',
        description: 'Massive planets with thick atmospheres rich in gases',
        paletteType: 'gasGiant',
    },
    {
        id: 1,
        label: 'Rocky',
        description: 'Dense, mineral-rich worlds with metallic cores',
        paletteType: 'rocky',
    },
    {
        id: 2,
        label: 'Terrestrial',
        description: 'Earth-like planets with varied terrain and life potential',
        paletteType: 'terrestrial',
    },
    {
        id: 3,
        label: 'Icy',
        description: 'Frozen worlds with subsurface resources',
        paletteType: 'ice',
    },
    {
        id: 4,
        label: 'Ocean',
        description: 'Water worlds with dissolved minerals and organics',
        paletteType: 'ocean',
    },
    {
        id: 5,
        label: 'Industrial',
        description: 'Heavily processed worlds rich in refined materials',
        paletteType: 'industrial',
    },
]

export function getPlanetSubtypes(): PlanetSubtypeInfo[] {
    return planetSubtypes
}

export function getPlanetSubtype(id: number): PlanetSubtypeInfo | undefined {
    return planetSubtypes.find((s) => s.id === id)
}
