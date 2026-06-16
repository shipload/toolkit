import {el, escapeXml} from './svg.ts'

export const componentIconSlugs = [
    'plate',
    'frame',
    'plasma-cell',
    'resonator',
    'beam',
    'sensor',
    'polymer',
    'ceramic',
    'reactor',
    'resin',
] as const

export type ComponentIconSlug = (typeof componentIconSlugs)[number]

export interface ComponentIconSvgOpts {
    size?: number
    title?: string
    className?: string
}

export interface ComponentIconInlineOpts {
    x: number
    y: number
    size: number
}

const componentIconLabels: Record<ComponentIconSlug, string> = {
    plate: 'Plate',
    frame: 'Frame',
    'plasma-cell': 'Plasma Cell',
    resonator: 'Resonator',
    beam: 'Beam',
    sensor: 'Sensor',
    polymer: 'Polymer',
    ceramic: 'Ceramic',
    reactor: 'Reactor',
    resin: 'Resin',
}

const componentIconNames: Record<string, ComponentIconSlug> = {
    plate: 'plate',
    frame: 'frame',
    'plasma cell': 'plasma-cell',
    'plasma-cell': 'plasma-cell',
    resonator: 'resonator',
    beam: 'beam',
    sensor: 'sensor',
    polymer: 'polymer',
    ceramic: 'ceramic',
    reactor: 'reactor',
    resin: 'resin',
}

function normalizeComponentName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s*\(?t\d+\)?$/, '')
}

export function componentIconSlugForName(name: string): ComponentIconSlug | null {
    return componentIconNames[normalizeComponentName(name)] ?? null
}

function plateIcon(): string {
    return [
        '<path d="M13 15 H42 L53 25 V47 L43 56 H17 L8 46 V24 Z" fill="#c26d3f" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M18 20 H41 L48 27 V43 L40 50 H19 L14 44 V26 Z" fill="#7f95a9" stroke="#06142f" stroke-width="2.5" stroke-linejoin="round"/>',
        '<path d="M18 20 H41 L48 27 L31 31 L14 26 Z" fill="#b9c9d6" opacity=".9"/>',
        '<path d="M31 31 L48 27 V43 L40 50 H25 Z" fill="#43586b" opacity=".65"/>',
        '<circle cx="20" cy="25" r="2.6" fill="#c26d3f" stroke="#06142f" stroke-width="1.5"/>',
        '<circle cx="40" cy="25" r="2.6" fill="#c26d3f" stroke="#06142f" stroke-width="1.5"/>',
        '<circle cx="24" cy="45" r="2.6" fill="#c26d3f" stroke="#06142f" stroke-width="1.5"/>',
        '<path d="M24 22 L35 22 M18 38 L25 45" stroke="#f6fbff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>',
    ].join('')
}

function frameIcon(): string {
    return [
        '<path d="M16 24 H40 V48 H16 Z M26 14 H50 V38 H26 Z M16 24 L26 14 M40 24 L50 14 M40 48 L50 38 M16 48 L26 38" fill="none" stroke="#06142f" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
        '<path d="M16 24 H40 V48 H16 Z M26 14 H50 V38 H26 Z M16 24 L26 14 M40 24 L50 14 M40 48 L50 38 M16 48 L26 38" fill="none" stroke="#c4a57b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
        '<path d="M19 27 H37 M29 17 H47 M19 45 H37" fill="none" stroke="#edd3a5" stroke-width="2.2" stroke-linecap="round" opacity=".86"/>',
        '<circle cx="16" cy="24" r="3.1" fill="#73ad49" stroke="#06142f" stroke-width="1.5"/>',
        '<circle cx="50" cy="38" r="3.1" fill="#73ad49" stroke="#06142f" stroke-width="1.5"/>',
    ].join('')
}

function plasmaCellIcon(): string {
    return [
        '<path d="M13 19 H51 L56 27 V46 L47 55 H17 L8 46 V27 Z" fill="#7f95a9" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M18 24 H29 V47 H18 Z M35 24 H46 V47 H35 Z" fill="#b877ff" stroke="#06142f" stroke-width="2.8" stroke-linejoin="round"/>',
        '<path d="M21 37 C23 31 28 32 28 37 M38 34 C40 28 45 30 45 35" fill="none" stroke="#f0d7ff" stroke-width="3.4" stroke-linecap="round"/>',
        '<path d="M19 21 H45 M16 51 H45" stroke="#b9c9d6" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>',
        '<circle cx="49" cy="28" r="2.5" fill="#f0d7ff" stroke="#06142f" stroke-width="1.3"/>',
    ].join('')
}

function resonatorIcon(): string {
    return [
        '<path d="M6 32 H58" stroke="#06142f" stroke-width="10" stroke-linecap="round"/>',
        '<path d="M6 32 H58" stroke="#c26d3f" stroke-width="6" stroke-linecap="round"/>',
        '<circle cx="32" cy="32" r="23" fill="#c26d3f" stroke="#06142f" stroke-width="4"/>',
        '<circle cx="32" cy="32" r="16" fill="#071026" stroke="#06142f" stroke-width="2.5"/>',
        '<path d="M10 32 H19 M45 32 H54" stroke="#4adbff" stroke-width="3.2" stroke-linecap="round"/>',
        '<path d="M32 8 L43 27 L36 55 H28 L21 27 Z" fill="#4adbff" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M32 8 L32 55 L21 27 Z" fill="#1689c7"/>',
        '<path d="M32 8 L43 27 L32 55 Z" fill="#86efff"/>',
        '<path d="M27 22 L32 14 M37 22 L41 27" stroke="#f7fbff" stroke-width="2.5" stroke-linecap="round"/>',
        '<path d="M12 24 C17 16 24 11 32 10 M52 40 C47 48 40 53 32 54" fill="none" stroke="#4adbff" stroke-width="2.7" stroke-linecap="round"/>',
    ].join('')
}

function beamIcon(): string {
    return [
        '<path d="M5 14 H59 V29 H45 V35 H59 V50 H5 V35 H19 V29 H5 Z" fill="#7f95a9" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M10 18 H54 V25 H10 Z" fill="#b9c9d6"/>',
        '<path d="M10 39 H54 V46 H10 Z" fill="#43586b"/>',
        '<path d="M19 25 H45 V39 H19 Z" fill="#c26d3f" stroke="#06142f" stroke-width="2.2" stroke-linejoin="round"/>',
        '<path d="M25 29 H39 M25 35 H39" stroke="#b877ff" stroke-width="3.4" stroke-linecap="round"/>',
        '<circle cx="14" cy="22" r="2.2" fill="#c26d3f" stroke="#06142f" stroke-width="1.2"/>',
        '<circle cx="50" cy="42" r="2.2" fill="#c26d3f" stroke="#06142f" stroke-width="1.2"/>',
    ].join('')
}

function sensorIcon(): string {
    return [
        '<path d="M13 18 H51 L56 26 V46 L47 55 H17 L8 46 V26 Z" fill="#7f95a9" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M18 24 H46 V44 H18 Z" fill="#071026" stroke="#06142f" stroke-width="2.6" stroke-linejoin="round"/>',
        '<path d="M23 39 C25 31 34 27 42 32" fill="none" stroke="#4adbff" stroke-width="4" stroke-linecap="round"/>',
        '<path d="M25 39 C29 36 35 35 40 37" fill="none" stroke="#b7fbff" stroke-width="2.6" stroke-linecap="round"/>',
        '<circle cx="24" cy="39" r="3.5" fill="#4adbff" stroke="#06142f" stroke-width="1.5"/>',
        '<path d="M45 20 L53 12" stroke="#06142f" stroke-width="6" stroke-linecap="round"/>',
        '<path d="M45 20 L53 12" stroke="#4adbff" stroke-width="3" stroke-linecap="round"/>',
        '<path d="M17 50 H31" stroke="#b9c9d6" stroke-width="2.5" stroke-linecap="round"/>',
    ].join('')
}

function polymerIcon(): string {
    return [
        '<ellipse cx="32" cy="15" rx="14" ry="6" fill="#7f95a9" stroke="#06142f" stroke-width="3.5"/>',
        '<path d="M20 16 H44 V49 C39 55 25 55 20 49 Z" fill="#5a8b3e" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M22 20 C29 16 36 16 42 20 M20 28 C28 34 37 34 44 28 M21 38 C29 33 36 33 43 38 M22 47 C29 51 36 51 42 47" fill="none" stroke="#a8db6f" stroke-width="3.2" stroke-linecap="round"/>',
        '<ellipse cx="32" cy="50" rx="14" ry="6" fill="#7f95a9" stroke="#06142f" stroke-width="3.5"/>',
        '<ellipse cx="32" cy="15" rx="5" ry="2.4" fill="#071026" stroke="#06142f" stroke-width="1.4"/>',
        '<ellipse cx="32" cy="50" rx="5" ry="2.4" fill="#071026" stroke="#06142f" stroke-width="1.4"/>',
        '<path d="M23 15 H41 M23 50 H41" stroke="#b9c9d6" stroke-width="2.3" stroke-linecap="round"/>',
    ].join('')
}

function ceramicIcon(): string {
    return [
        '<path d="M20 10 H44 L55 21 V45 L44 56 H20 L9 45 V21 Z" fill="#c4a57b" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M23 18 H41 L48 25 V42 L41 49 H23 L16 42 V25 Z" fill="#edd3a5" stroke="#06142f" stroke-width="2.2" stroke-linejoin="round"/>',
        '<path d="M23 18 H41 L48 25 L32 30 L16 25 Z" fill="#f5dfb8"/>',
        '<path d="M32 30 L48 25 V42 L41 49 H32 Z" fill="#9e7c55" opacity=".45"/>',
        '<path d="M24 24 H40 M20 39 H28 M37 45 H43" stroke="#82664b" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>',
        '<circle cx="32" cy="33" r="3.2" fill="#c4a57b" stroke="#06142f" stroke-width="1.4"/>',
    ].join('')
}

function reactorIcon(): string {
    return [
        '<path d="M16 14 H48 L56 25 V46 L47 56 H17 L8 46 V25 Z" fill="#c4a57b" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M18 18 H46 L51 27 V43 L43 51 H21 L13 43 V27 Z" fill="#82664b" stroke="#06142f" stroke-width="2.5" stroke-linejoin="round"/>',
        '<path d="M23 25 H41 V43 L36 49 H28 L23 43 Z" fill="#b877ff" stroke="#06142f" stroke-width="3" stroke-linejoin="round"/>',
        '<path d="M27 30 V41 M32 28 V45 M37 30 V41" stroke="#f0d7ff" stroke-width="3.4" stroke-linecap="round"/>',
        '<path d="M13 31 H6 V43 H13 M51 31 H58 V43 H51" fill="#c4a57b" stroke="#06142f" stroke-width="3.5" stroke-linejoin="round"/>',
        '<path d="M22 20 H42 M24 53 H40" stroke="#edd3a5" stroke-width="3" stroke-linecap="round"/>',
    ].join('')
}

function resinIcon(): string {
    return [
        '<path d="M24 8 H40 V18 L48 30 V51 L40 58 H24 L16 51 V30 L24 18 Z" fill="#7f95a9" stroke="#06142f" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M21 33 H43 V50 L37 55 H27 L21 50 Z" fill="#5a8b3e" stroke="#06142f" stroke-width="2.5" stroke-linejoin="round"/>',
        '<path d="M24 10 H40 V18 H24 Z" fill="#4adbff" stroke="#06142f" stroke-width="2.5"/>',
        '<path d="M25 38 C31 43 38 42 43 36" stroke="#a8db6f" stroke-width="4" stroke-linecap="round" fill="none"/>',
        '<circle cx="36" cy="44" r="3" fill="#b7fbff" stroke="#06142f" stroke-width="1.5"/>',
        '<path d="M23 27 H41" stroke="#b9c9d6" stroke-width="2.7" stroke-linecap="round"/>',
    ].join('')
}

const iconBodies: Record<ComponentIconSlug, string> = {
    plate: plateIcon(),
    frame: frameIcon(),
    'plasma-cell': plasmaCellIcon(),
    resonator: resonatorIcon(),
    beam: beamIcon(),
    sensor: sensorIcon(),
    polymer: polymerIcon(),
    ceramic: ceramicIcon(),
    reactor: reactorIcon(),
    resin: resinIcon(),
}

export function componentIconBody(slug: ComponentIconSlug): string {
    return iconBodies[slug]
}

export function componentIcon(slug: ComponentIconSlug, opts: ComponentIconInlineOpts): string {
    const scale = opts.size / 64
    return el(
        'g',
        {transform: `translate(${opts.x} ${opts.y}) scale(${scale})`, 'data-component': slug},
        componentIconBody(slug)
    )
}

export function componentIconSvg(slug: ComponentIconSlug, opts: ComponentIconSvgOpts = {}): string {
    const size = opts.size ?? 64
    const title = opts.title ?? `${componentIconLabels[slug]} component icon`
    const children = `<title>${escapeXml(title)}</title>${componentIconBody(slug)}`
    return el(
        'svg',
        {
            xmlns: 'http://www.w3.org/2000/svg',
            width: size,
            height: size,
            viewBox: '0 0 64 64',
            role: 'img',
            class: opts.className,
            'aria-label': title,
        },
        children
    )
}
