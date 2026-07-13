import {el, escapeXml} from './svg.ts'

export const moduleIconSlugs = [
    'engine',
    'generator',
    'gatherer',
    'loader',
    'warp',
    'crafter',
    'builder',
    'launcher',
    'storage',
    'hauler',
    'battery',
    'any',
] as const

export type ModuleIconSlug = (typeof moduleIconSlugs)[number]

export interface ModuleIconSvgOpts {
    size?: number
    title?: string
    className?: string
}

export interface ModuleIconInlineOpts {
    x: number
    y: number
    size: number
}

const moduleIconLabels: Record<ModuleIconSlug, string> = {
    engine: 'Engine',
    generator: 'Power Core',
    gatherer: 'Limpet Bay',
    loader: 'Shuttle Bay',
    warp: 'Warp Drive',
    crafter: 'Fabricator',
    builder: 'Assembly Arm',
    launcher: 'Drive Coil',
    storage: 'Cargo Hold',
    hauler: 'Tractor Beam',
    battery: 'Battery Bank',
    any: 'Any',
}

const moduleIconNames: Record<string, ModuleIconSlug> = {
    engine: 'engine',
    generator: 'generator',
    'power core': 'generator',
    'power-core': 'generator',
    gatherer: 'gatherer',
    'limpet bay': 'gatherer',
    'limpet-bay': 'gatherer',
    loader: 'loader',
    'shuttle bay': 'loader',
    'shuttle-bay': 'loader',
    warp: 'warp',
    'warp drive': 'warp',
    'warp-drive': 'warp',
    crafter: 'crafter',
    fabricator: 'crafter',
    builder: 'builder',
    'assembly arm': 'builder',
    'assembly-arm': 'builder',
    launcher: 'launcher',
    'drive coil': 'launcher',
    'drive-coil': 'launcher',
    storage: 'storage',
    'cargo hold': 'storage',
    'cargo-hold': 'storage',
    hauler: 'hauler',
    'tractor beam': 'hauler',
    'tractor-beam': 'hauler',
    battery: 'battery',
    'battery bank': 'battery',
    'battery-bank': 'battery',
    any: 'any',
}

function normalizeModuleName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s*\(?t\d+\)?$/, '')
}

export function moduleIconSlugForName(name: string): ModuleIconSlug | null {
    return moduleIconNames[normalizeModuleName(name)] ?? null
}

export function moduleIconSlugForType(
    moduleType: string | null | undefined
): ModuleIconSlug | null {
    return moduleType ? (moduleIconNames[normalizeModuleName(moduleType)] ?? null) : null
}

function engineIcon(): string {
    return [
        '<path d="M88 57 C88 38 106 28 128 28 C150 28 168 38 168 57 L168 139 C168 164 152 181 128 181 C104 181 88 164 88 139 Z" fill="#553686" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M98 54 C103 44 114 39 128 39 C142 39 153 44 158 54 L158 69 C148 76 108 76 98 69 Z" fill="#f1daa4" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M88 123 C100 136 108 141 128 141 C148 141 156 136 168 123 L168 143 C159 163 144 173 128 173 C112 173 97 163 88 143 Z" fill="#2b2342" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M104 139 V163 M128 142 V172 M152 139 V163" stroke="#120d1b" stroke-width="7" stroke-linecap="round"/>',
        '<path d="M97 68 C112 76 144 76 159 68" fill="none" stroke="#7450a7" stroke-width="7" stroke-linecap="round"/>',
        '<path d="M96 161 C94 188 108 213 121 232 L128 207 L135 232 C148 213 162 188 160 161 C149 174 138 185 128 193 C118 185 107 174 96 161 Z" fill="#39e4ef" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<path d="M105 183 L98 198 M151 183 L158 198" fill="none" stroke="#eefcff" stroke-width="7" stroke-linecap="round"/>',
    ].join('')
}

function generatorIcon(): string {
    return [
        '<path d="M68 63 C68 46 93 37 128 37 C163 37 188 46 188 63 L188 193 C188 210 163 219 128 219 C93 219 68 210 68 193 Z" fill="#493172" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M80 58 C88 49 105 44 128 44 C151 44 168 49 176 58 L176 76 C164 86 92 86 80 76 Z" fill="#2b2342" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<rect x="89" y="80" width="78" height="108" rx="12" fill="#35dfe9" stroke="#120d1b" stroke-width="9"/>',
        '<path d="M136 98 L110 143 H130 L119 175 L148 124 H130 Z" fill="#eefcff" stroke="#35dfe9" stroke-width="4" stroke-linejoin="round"/>',
        '<rect x="47" y="91" width="21" height="78" rx="8" fill="#f1daa4" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="188" y="91" width="21" height="78" rx="8" fill="#f1daa4" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="106" y="27" width="44" height="27" rx="8" fill="#f1daa4" stroke="#120d1b" stroke-width="8"/>',
        '<path d="M80 174 C92 184 164 184 176 174 L176 196 C164 207 92 207 80 196 Z" fill="#2b2342" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
    ].join('')
}

function gathererIcon(): string {
    return [
        '<path d="M48 102 L76 70 C86 59 101 61 108 72 L93 91 C86 88 77 93 70 103 L70 151 C86 171 106 181 128 181 C150 181 170 171 186 151 L186 103 C179 93 170 88 163 91 L148 72 C155 61 170 59 180 70 L208 102 L208 176 C187 201 159 214 128 214 C97 214 69 201 48 176 Z" fill="#1e61b5" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M68 94 L87 71 C94 62 105 65 108 74 L90 103 L90 150 L106 170 C97 177 84 175 76 165 L62 148 L62 106 Z" fill="#f1daa4" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M188 94 L169 71 C162 62 151 65 148 74 L166 103 L166 150 L150 170 C159 177 172 175 180 165 L194 148 L194 106 Z" fill="#f1daa4" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M73 160 C90 176 108 184 128 184 C148 184 166 176 183 160 L183 187 C166 202 148 210 128 210 C108 210 90 202 73 187 Z" fill="#1f6fc7" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M94 103 C96 82 112 72 128 72 C144 72 160 82 162 103 L162 147 C155 162 142 170 128 170 C114 170 101 162 94 147 Z" fill="#332954" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<ellipse cx="128" cy="93" rx="30" ry="20" fill="#42e2ef" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="116" y="127" width="24" height="34" rx="9" fill="#3ee4ef" stroke="#120d1b" stroke-width="7"/>',
        '<rect x="98" y="182" width="60" height="24" rx="8" fill="#3ee4ef" stroke="#f1daa4" stroke-width="7"/>',
    ].join('')
}

function loaderIcon(): string {
    return [
        '<path d="M51 84 H86 L86 103 H77 V177 L106 208 H75 L48 181 V97 Z" fill="#3f3268" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M205 84 H170 L170 103 H179 V177 L150 208 H181 L208 181 V97 Z" fill="#3f3268" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M48 84 L72 55 H100 L86 84 Z" fill="#f59416" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<path d="M208 84 L184 55 H156 L170 84 Z" fill="#f59416" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<path d="M78 102 H98 V164 H78 Z M158 102 H178 V164 H158 Z" fill="#f1daa4" stroke="#120d1b" stroke-width="7" stroke-linejoin="round"/>',
        '<path d="M93 120 L109 96 H147 L163 120 V184 H93 Z" fill="#6f696d" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<rect x="105" y="124" width="46" height="48" fill="#302b33" stroke="#120d1b" stroke-width="7"/>',
        '<path d="M111 86 H145 L153 99 V120 H103 V99 Z" fill="#9b9184" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<rect x="121" y="75" width="14" height="31" rx="4" fill="#f59416" stroke="#120d1b" stroke-width="6"/>',
        '<rect x="75" y="151" width="32" height="35" rx="7" fill="#3f3268" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="149" y="151" width="32" height="35" rx="7" fill="#3f3268" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="84" y="161" width="14" height="20" rx="4" fill="#f59416" stroke="#120d1b" stroke-width="5"/>',
        '<rect x="158" y="161" width="14" height="20" rx="4" fill="#f59416" stroke="#120d1b" stroke-width="5"/>',
        '<rect x="73" y="193" width="52" height="41" rx="9" fill="#f59416" stroke="#120d1b" stroke-width="9"/>',
        '<rect x="131" y="193" width="52" height="41" rx="9" fill="#f59416" stroke="#120d1b" stroke-width="9"/>',
    ].join('')
}

function warpIcon(): string {
    return [
        '<circle cx="128" cy="128" r="94" fill="#3f3268" stroke="#120d1b" stroke-width="10"/>',
        '<circle cx="128" cy="128" r="73" fill="#2b2245" stroke="#120d1b" stroke-width="7"/>',
        '<rect x="108" y="17" width="40" height="22" rx="5" fill="#f59416" stroke="#120d1b" stroke-width="7"/>',
        '<rect x="108" y="217" width="40" height="22" rx="5" fill="#f59416" stroke="#120d1b" stroke-width="7"/>',
        '<rect x="17" y="108" width="22" height="40" rx="5" fill="#f59416" stroke="#120d1b" stroke-width="7"/>',
        '<rect x="217" y="108" width="22" height="40" rx="5" fill="#f59416" stroke="#120d1b" stroke-width="7"/>',
        '<path d="M79 159 C64 119 88 78 128 70 C160 64 183 79 183 104 C183 129 153 144 130 128 C113 116 119 96 143 99" fill="none" stroke="#3ee4ef" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>',
        '<path d="M177 97 C192 137 168 178 128 186 C96 192 73 177 73 152 C73 127 103 112 126 128 C143 140 137 160 113 157" fill="none" stroke="#3ee4ef" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>',
        '<circle cx="128" cy="128" r="17" fill="#2b2245" stroke="#120d1b" stroke-width="8"/>',
        '<path d="M67 101 C79 74 101 58 128 56 M189 155 C177 182 155 198 128 200" fill="none" stroke="#60448e" stroke-width="7" stroke-linecap="round"/>',
    ].join('')
}

function crafterIcon(): string {
    return [
        '<path d="M60 28 H196 L228 64 V194 L197 228 H59 L28 194 V64 Z" fill="#3f2b63" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<rect x="101" y="43" width="54" height="18" rx="4" fill="#39e4ef" stroke="#120d1b" stroke-width="5"/>',
        '<circle cx="83" cy="77" r="25" fill="#e72a9a" stroke="#120d1b" stroke-width="8"/>',
        '<circle cx="173" cy="77" r="25" fill="#e72a9a" stroke="#120d1b" stroke-width="8"/>',
        '<circle cx="83" cy="77" r="10" fill="#2c2343" stroke="#120d1b" stroke-width="6"/>',
        '<circle cx="173" cy="77" r="10" fill="#2c2343" stroke="#120d1b" stroke-width="6"/>',
        '<path d="M65 94 H93 L83 147 L54 142 Z" fill="#e72a9a" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M191 94 H163 L173 147 L202 142 Z" fill="#e72a9a" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M59 142 L83 151 L95 176 L80 185 L65 166 L49 160 Z" fill="#e72a9a" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M197 142 L173 151 L161 176 L176 185 L191 166 L207 160 Z" fill="#e72a9a" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M128 78 L143 93 H164 V116 L148 128 L164 140 V163 H143 L128 178 L113 163 H92 V140 L108 128 L92 116 V93 H113 Z" fill="#ffcb1f" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<circle cx="128" cy="128" r="22" fill="#2b2631" stroke="#120d1b" stroke-width="8"/>',
        '<path d="M79 186 L64 203 M177 186 L192 203" stroke="#e72a9a" stroke-width="12" stroke-linecap="round"/>',
    ].join('')
}

function builderIcon(): string {
    return [
        '<path d="M30 176 L48 156 H124 L142 176 V212 L124 230 H48 L30 212 Z" fill="#3f3268" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<rect x="48" y="196" width="76" height="20" rx="6" fill="#39e4ef" stroke="#120d1b" stroke-width="6"/>',
        '<path d="M96 150 L118 96 L146 108 L124 162 Z" fill="#39e4ef" stroke="#120d1b" stroke-width="7" stroke-linejoin="round"/>',
        '<path d="M70 166 L100 82 L136 95 L106 179 Z" fill="#f59416" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<path d="M112 92 L196 52 L211 82 L127 122 Z" fill="#ffac2e" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<circle cx="86" cy="170" r="24" fill="#e72a9a" stroke="#120d1b" stroke-width="8"/>',
        '<circle cx="86" cy="170" r="9" fill="#2c2343" stroke="#120d1b" stroke-width="6"/>',
        '<circle cx="118" cy="98" r="19" fill="#e72a9a" stroke="#120d1b" stroke-width="8"/>',
        '<circle cx="118" cy="98" r="7" fill="#2c2343" stroke="#120d1b" stroke-width="5"/>',
        '<path d="M197 46 L232 30 L242 52 L208 68 Z" fill="#ffcb1f" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M209 80 L244 96 L234 118 L199 102 Z" fill="#ffcb1f" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<circle cx="203" cy="74" r="12" fill="#2c2343" stroke="#120d1b" stroke-width="6"/>',
    ].join('')
}

function launcherIcon(): string {
    return [
        '<rect x="35" y="78" width="186" height="100" rx="28" fill="#3f3268" stroke="#120d1b" stroke-width="10"/>',
        '<rect x="21" y="93" width="30" height="70" rx="12" fill="#f1daa4" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="205" y="93" width="30" height="70" rx="12" fill="#f1daa4" stroke="#120d1b" stroke-width="8"/>',
        '<path d="M61 78 C51 98 51 158 61 178 H86 C75 155 75 101 86 78 Z" fill="#2d2248" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M195 78 C205 98 205 158 195 178 H170 C181 155 181 101 170 78 Z" fill="#2d2248" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<rect x="86" y="94" width="22" height="68" rx="7" fill="#39e4ef" stroke="#120d1b" stroke-width="6"/>',
        '<rect x="118" y="94" width="22" height="68" rx="7" fill="#39e4ef" stroke="#120d1b" stroke-width="6"/>',
        '<rect x="150" y="94" width="22" height="68" rx="7" fill="#39e4ef" stroke="#120d1b" stroke-width="6"/>',
        '<path d="M89 178 H167" stroke="#6d4c9b" stroke-width="7" stroke-linecap="round"/>',
    ].join('')
}

function storageIcon(): string {
    return [
        '<path d="M35 53 L58 30 H198 L221 53 V198 L199 224 H57 L35 198 Z" fill="#3f3268" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M60 58 H196 V189 H60 Z" fill="#161321" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<rect x="75" y="72" width="50" height="50" rx="9" fill="#f59416" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="132" y="72" width="50" height="50" rx="9" fill="#f59416" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="75" y="132" width="50" height="50" rx="9" fill="#f59416" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="132" y="132" width="50" height="50" rx="9" fill="#f59416" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="87" y="84" width="26" height="26" fill="#ffac2e" stroke="#9a4a13" stroke-width="5"/>',
        '<rect x="144" y="84" width="26" height="26" fill="#ffac2e" stroke="#9a4a13" stroke-width="5"/>',
        '<rect x="87" y="144" width="26" height="26" fill="#ffac2e" stroke="#9a4a13" stroke-width="5"/>',
        '<rect x="144" y="144" width="26" height="26" fill="#ffac2e" stroke="#9a4a13" stroke-width="5"/>',
        '<rect x="86" y="203" width="84" height="25" rx="8" fill="#f1daa4" stroke="#120d1b" stroke-width="8"/>',
    ].join('')
}

function haulerIcon(): string {
    return [
        '<path d="M30 83 L56 57 H105 L128 80 V176 L103 201 H43 L30 188 Z" fill="#3f3268" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M99 76 L124 96 V160 L99 181 L80 169 V88 Z" fill="#f1daa4" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<rect x="49" y="119" width="22" height="54" rx="5" fill="#39e4ef" stroke="#120d1b" stroke-width="7"/>',
        '<path d="M126 105 L210 55 C218 50 227 55 227 64 V192 C227 201 218 206 210 201 L126 151 Z" fill="#35dfe9" fill-opacity=".86" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M141 112 L210 72 V184 L141 144 Z" fill="#54edf4" stroke="#9effff" stroke-width="5" stroke-linejoin="round"/>',
        '<path d="M178 96 H216 V160 H178 Z" fill="#f59416" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M216 96 L237 110 V174 L216 160 Z" fill="#d76d10" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M178 96 L199 82 H237 L216 96 Z" fill="#ffac2e" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
    ].join('')
}

function batteryIcon(): string {
    return [
        '<path d="M35 54 H221 V198 L199 224 H57 L35 198 Z" fill="#3f3268" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M48 77 H208 V188 H48 Z" fill="#15141d" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<rect x="37" y="48" width="182" height="25" rx="5" fill="#f1daa4" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="68" y="92" width="40" height="82" rx="13" fill="#35dfe9" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="118" y="92" width="40" height="82" rx="13" fill="#35dfe9" stroke="#120d1b" stroke-width="8"/>',
        '<rect x="168" y="92" width="40" height="82" rx="13" fill="#35dfe9" stroke="#120d1b" stroke-width="8"/>',
        '<path d="M78 106 V158 M128 106 V158 M178 106 V158" stroke="#9effff" stroke-width="7" stroke-linecap="round"/>',
        '<path d="M54 188 L72 206 H184 L202 188" fill="none" stroke="#120d1b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>',
    ].join('')
}

function anyIcon(): string {
    return [
        '<path d="M49 74 L83 40 H108 L108 69 L91 86 L91 170 L108 187 L108 216 H82 L49 183 Z" fill="#3f3268" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M207 74 L173 40 H148 L148 69 L165 86 L165 170 L148 187 L148 216 H174 L207 183 Z" fill="#3f3268" stroke="#120d1b" stroke-width="10" stroke-linejoin="round"/>',
        '<path d="M84 91 L105 70 L105 186 L84 165 Z" fill="#f1daa4" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M172 91 L151 70 L151 186 L172 165 Z" fill="#f1daa4" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
        '<path d="M128 72 L164 128 L128 184 L92 128 Z" fill="#35dfe9" stroke="#120d1b" stroke-width="9" stroke-linejoin="round"/>',
        '<path d="M128 73 L145 128 L128 183 L111 128 Z" fill="#7af4f8" stroke="#35dfe9" stroke-width="4" stroke-linejoin="round"/>',
        '<path d="M95 128 H161" stroke="#9effff" stroke-width="7" stroke-linecap="round"/>',
        '<path d="M101 217 L113 199 H143 L155 217 V236 H101 Z" fill="#f59416" stroke="#120d1b" stroke-width="8" stroke-linejoin="round"/>',
    ].join('')
}

const iconBodies: Record<ModuleIconSlug, string> = {
    engine: engineIcon(),
    generator: generatorIcon(),
    gatherer: gathererIcon(),
    loader: loaderIcon(),
    warp: warpIcon(),
    crafter: crafterIcon(),
    builder: builderIcon(),
    launcher: launcherIcon(),
    storage: storageIcon(),
    hauler: haulerIcon(),
    battery: batteryIcon(),
    any: anyIcon(),
}

export function moduleIconBody(slug: ModuleIconSlug): string {
    return iconBodies[slug]
}

export function moduleIcon(slug: ModuleIconSlug, opts: ModuleIconInlineOpts): string {
    const scale = opts.size / 256
    return el(
        'g',
        {transform: `translate(${opts.x} ${opts.y}) scale(${scale})`, 'data-module': slug},
        moduleIconBody(slug)
    )
}

export function moduleIconSvg(slug: ModuleIconSlug, opts: ModuleIconSvgOpts = {}): string {
    const size = opts.size ?? 64
    const title = opts.title ?? `${moduleIconLabels[slug]} module icon`
    const children = `<title>${escapeXml(title)}</title>${moduleIconBody(slug)}`
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
