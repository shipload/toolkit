import {getPackedEntityType} from '@shipload/sdk'
import {el, escapeXml} from './svg.ts'

export const stationEntityIconKinds = [
    'hub',
    'warehouse',
    'extractor',
    'factory',
    'mdriver',
    'mcatcher',
] as const

export type StationEntityIconKind = (typeof stationEntityIconKinds)[number]

export interface StationEntityIconSvgOpts {
    size?: number
    title?: string
    className?: string
}

export interface StationEntityIconInlineOpts {
    x: number
    y: number
    size: number
}

const stationEntityIconLabels: Record<StationEntityIconKind, string> = {
    hub: 'Station Hub',
    warehouse: 'Warehouse',
    extractor: 'Extractor',
    factory: 'Factory',
    mdriver: 'Mass Driver',
    mcatcher: 'Mass Catcher',
}

const stationEntityIconNames: Record<string, StationEntityIconKind> = {
    hub: 'hub',
    'station hub': 'hub',
    warehouse: 'warehouse',
    extractor: 'extractor',
    'mining rig': 'extractor',
    factory: 'factory',
    mdriver: 'mdriver',
    'meteor driver': 'mdriver',
    'mass driver': 'mdriver',
    mcatcher: 'mcatcher',
    'meteor catcher': 'mcatcher',
    'mass catcher': 'mcatcher',
}

const kindSet = new Set<string>(stationEntityIconKinds)

function normalizeName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s*\(?t\d+\)?$/, '')
}

export function stationEntityIconLabelForKind(kind: StationEntityIconKind): string {
    return stationEntityIconLabels[kind]
}

export function stationEntityIconKindForName(name: string): StationEntityIconKind | null {
    return stationEntityIconNames[normalizeName(name)] ?? null
}

export function stationEntityIconKindForPackedItemId(
    packedItemId: number
): StationEntityIconKind | null {
    const kind = getPackedEntityType(packedItemId)?.toString()
    return kind && kindSet.has(kind) ? (kind as StationEntityIconKind) : null
}

const OUTLINE = '#070712'

function wrap(children: string): string {
    return el(
        'g',
        {
            fill: 'none',
            stroke: OUTLINE,
            'stroke-width': 8,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
        },
        children
    )
}

function hubIcon(): string {
    return wrap(
        [
            '<path d="M128 18l36 22h42l10 10v42l22 36-22 36v42l-10 10h-42l-36 22-36-22H50l-10-10v-42l-22-36 22-36V50l10-10h42z" fill="#f7e8a8"/>',
            '<path d="M128 31l31 20h36l8 8v36l20 33-20 33v36l-8 8h-36l-31 20-31-20H61l-8-8v-36l-20-33 20-33V59l8-8h36z" fill="#382f55"/>',
            '<path d="M83 63h90l20 20v90l-20 20H83l-20-20V83z" fill="#4d406d"/>',
            '<path d="M128 51l29 22 35 6-7 36 16 33-33 17-17 33-23-26-23 26-17-33-33-17 16-33-7-36 35-6z" fill="#312949"/>',
            '<circle cx="128" cy="128" r="57" fill="#f8e7a8"/>',
            '<circle cx="128" cy="128" r="43" fill="#dba92e"/>',
            '<circle cx="128" cy="128" r="31" fill="#f3c53a" stroke-width="5"/>',
            '<path d="M128 82l11 32 32-8-24 24 23 25-31-9-11 32-11-32-31 9 23-25-24-24 32 8z" fill="#fff7b8"/>',
            '<path d="M104 42h48v19h-48zM104 195h48v19h-48zM42 104h19v48H42zM195 104h19v48h-19z" fill="#f2d784"/>',
            '<path d="M113 50h30M113 204h30M50 113v30M204 113v30" stroke="#ffca22" stroke-width="7"/>',
            '<path d="M80 80l11 11M176 80l-11 11M80 176l11-11M176 176l-11-11" stroke="#ffca22" stroke-width="7"/>',
        ].join('')
    )
}

function warehouseIcon(): string {
    return wrap(
        [
            '<path d="M48 30h160l18 18v160l-18 18H48l-18-18V48z" fill="#f7e8a8"/>',
            '<path d="M58 40h140l16 16v144l-16 16H58l-16-16V56z" fill="#362d53"/>',
            '<path d="M77 59h42l10 10v54l-10 10H77l-10-10V69z" fill="#f28a15"/>',
            '<path d="M137 59h42l10 10v54l-10 10h-42l-10-10V69z" fill="#f28a15"/>',
            '<path d="M60 140h136l11 11v47l-11 11H60l-11-11v-47z" fill="#f28a15"/>',
            '<path d="M67 151h122M67 165h122M67 179h122M67 193h122" stroke="#9b4d0f" stroke-width="5"/>',
            '<path d="M128 44v95" stroke="#211c35" stroke-width="15"/>',
            '<path d="M113 51h30M113 119h30M50 83v45M206 83v45M81 216h35M140 216h35" stroke="#ffb02d" stroke-width="7"/>',
            '<path d="M91 79v35M108 79v35M151 79v35M168 79v35" stroke="#8c4510" stroke-width="6"/>',
            '<path d="M75 126h106M75 139h106" stroke="#f7e8a8" stroke-width="7"/>',
            '<path d="M87 151l-16 16M179 151l-16 16" stroke="#fff2bc" stroke-width="5"/>',
        ].join('')
    )
}

function extractorIcon(): string {
    return wrap(
        [
            '<path d="M51 29h154l21 21v154l-21 21H51l-21-21V50z" fill="#f7e8a8"/>',
            '<path d="M62 39h132l20 20v136l-20 20H62l-20-20V59z" fill="#332b50"/>',
            '<path d="M72 63h51l10 10v82l-10 10H72l-10-10V73z" fill="#237e75"/>',
            '<path d="M133 63h51l10 10v82l-10 10h-51l-10-10V73z" fill="#2b9389"/>',
            '<path d="M70 92h55M70 122h55M133 92h55M133 122h55" stroke="#185b55" stroke-width="7"/>',
            '<path d="M128 50v119" stroke="#211b35" stroke-width="14"/>',
            '<path d="M74 54h108M65 164h126" stroke="#f7e8a8" stroke-width="7"/>',
            '<path d="M60 36h136M60 220h136" stroke="#4b3f6c" stroke-width="12"/>',
            '<path d="M31 88h37v71H31zM188 88h37v71h-37z" fill="#342d50"/>',
            '<path d="M45 101h14v45H45zM197 101h14v45h-14z" fill="#23a89b"/>',
            '<circle cx="128" cy="183" r="40" fill="#332b50"/>',
            '<circle cx="128" cy="183" r="27" fill="#18a99d"/>',
            '<circle cx="128" cy="183" r="16" fill="#14746d" stroke-width="4"/>',
            '<path d="M101 161l12 12M155 161l-12 12M101 205l12-12M155 205l-12-12" stroke="#f7e8a8" stroke-width="7"/>',
            '<path d="M114 38h28M119 127v31" stroke="#5ce9dc" stroke-width="6"/>',
        ].join('')
    )
}

function factoryIcon(): string {
    return wrap(
        [
            '<circle cx="128" cy="128" r="104" fill="#f7e8a8"/>',
            '<circle cx="128" cy="128" r="93" fill="#332b50"/>',
            '<path d="M77 37h102l25 25v132l-25 25H77l-25-25V62z" fill="#433861"/>',
            '<circle cx="128" cy="128" r="72" fill="#2b2541"/>',
            '<path d="M128 72l13 19 23-2 3 24 21 13-13 21 8 22-24 8-10 22-21-13-21 13-10-22-24-8 8-22-13-21 21-13 3-24 23 2z" fill="#f6c51f"/>',
            '<circle cx="128" cy="128" r="24" fill="#49405f"/>',
            '<path d="M72 80h112l14 16v21H58V96zM58 158h140v21l-14 16H72z" fill="#e72c9a"/>',
            '<path d="M58 91l-21 28v52l21 28M198 91l21 28v52l-21 28" stroke="#332b50" stroke-width="17"/>',
            '<path d="M78 84l-30 65M178 84l30 65" stroke="#e72c9a" stroke-width="18"/>',
            '<circle cx="55" cy="80" r="21" fill="#e72c9a"/>',
            '<circle cx="201" cy="80" r="21" fill="#e72c9a"/>',
            '<circle cx="55" cy="80" r="11" fill="#ffc51d"/>',
            '<circle cx="201" cy="80" r="11" fill="#ffc51d"/>',
            '<path d="M50 126l-9 22M206 126l9 22" stroke="#332b50" stroke-width="7"/>',
            '<path d="M83 93l-15 15M95 93l-15 15M161 170l-15 15M173 170l-15 15" stroke="#ffe5a4" stroke-width="5"/>',
        ].join('')
    )
}

function mdriverIcon(): string {
    return wrap(
        [
            '<path d="M48 28h160l20 20v160l-20 20H48l-20-20V48z" fill="#f7e8a8"/>',
            '<path d="M59 39h138l18 18v142l-18 18H59l-18-18V57z" fill="#332b50"/>',
            '<circle cx="128" cy="128" r="54" fill="#2a2342"/>',
            '<circle cx="128" cy="128" r="27" fill="#18cfe5"/>',
            '<path d="M52 63h42M162 193h42M52 193h42M162 63h42" stroke="#f7e8a8" stroke-width="7"/>',
            '<path d="M31 128h194" stroke="#19162c" stroke-width="48"/>',
            '<path d="M40 128h176" stroke="#20d8ec" stroke-width="30"/>',
            '<path d="M56 128h144" stroke="#75eff8" stroke-width="13"/>',
            '<path d="M38 128l42-42M176 170l42-42" stroke="#19162c" stroke-width="34"/>',
            '<path d="M50 116l58-58M148 198l58-58" stroke="#332b50" stroke-width="26"/>',
            '<path d="M84 94l89 89M82 162l89-89" stroke="#f7e8a8" stroke-width="9"/>',
            '<path d="M96 102l64 64M96 154l64-64" stroke="#1f1a31" stroke-width="9"/>',
            '<path d="M97 43h62M97 213h62M43 97v62M213 97v62" stroke="#20d8ec" stroke-width="7"/>',
            '<path d="M70 68l-17 17M186 188l17-17" stroke="#ffffff" stroke-opacity=".65" stroke-width="5"/>',
        ].join('')
    )
}

function mcatcherIcon(): string {
    return wrap(
        [
            '<path d="M38 61h180l-17 129-45 39H100l-45-39z" fill="#f7e8a8"/>',
            '<path d="M49 72h158l-17 108-39 35h-46l-39-35z" fill="#332b50"/>',
            '<path d="M61 73c7 58 36 88 67 88s60-30 67-88z" fill="#36ddeb"/>',
            '<path d="M72 83c8 43 29 63 56 63s48-20 56-63" stroke="#90f6ff" stroke-width="10"/>',
            '<path d="M65 64c24-29 102-29 126 0l-12 22c-26-18-76-18-102 0z" fill="#f7e8a8"/>',
            '<path d="M74 76c21-19 87-19 108 0" stroke="#fff4bd" stroke-width="9"/>',
            '<path d="M43 78l-18 55 24 67 40 29M213 78l18 55-24 67-40 29" stroke="#332b50" stroke-width="19"/>',
            '<path d="M58 82v59M198 82v59" stroke="#8b45de" stroke-width="21"/>',
            '<path d="M75 162l31 53M181 162l-31 53" stroke="#8b45de" stroke-width="25"/>',
            '<path d="M109 174h38l12 23-12 32h-38l-12-32z" fill="#352a55"/>',
            '<path d="M116 183h24v18h-24z" fill="#35ddeb"/>',
            '<path d="M128 160v54" stroke="#35ddeb" stroke-width="8"/>',
            '<path d="M79 169l12 11M177 169l-12 11" stroke="#58edf6" stroke-width="6"/>',
            '<path d="M87 104c22 17 60 17 82 0" stroke="#bcfbff" stroke-opacity=".75" stroke-width="5"/>',
        ].join('')
    )
}

const iconBodies: Record<StationEntityIconKind, string> = {
    hub: hubIcon(),
    warehouse: warehouseIcon(),
    extractor: extractorIcon(),
    factory: factoryIcon(),
    mdriver: mdriverIcon(),
    mcatcher: mcatcherIcon(),
}

export function stationEntityIconBody(kind: StationEntityIconKind): string {
    return iconBodies[kind]
}

export function stationEntityIcon(
    kind: StationEntityIconKind,
    opts: StationEntityIconInlineOpts
): string {
    const scale = opts.size / 256
    return el(
        'g',
        {
            transform: `translate(${opts.x} ${opts.y}) scale(${scale})`,
            'data-station-entity': kind,
        },
        stationEntityIconBody(kind)
    )
}

export function stationEntityIconSvg(
    kind: StationEntityIconKind,
    opts: StationEntityIconSvgOpts = {}
): string {
    const size = opts.size ?? 64
    const title = opts.title ?? `${stationEntityIconLabels[kind]} entity icon`
    const children = `<title>${escapeXml(title)}</title>${stationEntityIconBody(kind)}`
    return el(
        'svg',
        {
            xmlns: 'http://www.w3.org/2000/svg',
            width: size,
            height: size,
            viewBox: '0 0 256 256',
            role: 'img',
            class: opts.className,
            'aria-label': title,
        },
        children
    )
}
