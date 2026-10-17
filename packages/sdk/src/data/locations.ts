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
        description: 'Yields gas up to T10 and crystal up to T3.',
        paletteType: 'gasGiant',
    },
    {
        id: 1,
        label: 'Rocky',
        description: 'Yields regolith up to T10 and ore up to T3.',
        paletteType: 'rocky',
    },
    {
        id: 2,
        label: 'Terrestrial',
        description: 'Yields ore up to T10 and biomass up to T3.',
        paletteType: 'terrestrial',
    },
    {
        id: 3,
        label: 'Icy',
        description: 'Yields crystal up to T10 and regolith up to T3.',
        paletteType: 'ice',
    },
    {
        id: 4,
        label: 'Ocean',
        description: 'Yields biomass up to T10 and gas up to T3.',
        paletteType: 'ocean',
    },
    {
        id: 5,
        label: 'Industrial',
        description: 'Yields ore, crystal, regolith, and biomass, each up to T3.',
        paletteType: 'industrial',
    },
]

export function getPlanetSubtypes(): PlanetSubtypeInfo[] {
    return planetSubtypes
}

export function getPlanetSubtype(id: number): PlanetSubtypeInfo | undefined {
    return planetSubtypes.find((s) => s.id === id)
}
