// Version
export const VERSION = '0.1.0'

// Errors
export {InvalidPayloadError, UnknownItemError, RenderError} from './errors.ts'

// Payload
export {
    encodeCargoItem,
    decodeCargoItem,
    encodeNftPayload,
    decodeNftPayload,
} from './payload/codec.ts'
export type {
    CargoItem,
    CargoItemLike,
    NftItemPayload,
    NftItemPayloadLike,
} from './payload/codec.ts'

// Rendering
export {renderItem, renderFromPayload, type RenderOptions} from './render.ts'
export {renderByType, type RenderByTypeOpts} from './templates/index.ts'

// Links + meta
export {linkToItemPage, linkToItemImage, linkToItemSocial} from './links.ts'
export {itemPageMeta, svgDimensions} from './meta.ts'
export type {ItemPageMeta, ItemPageMetaOptions} from './meta.ts'

// Tokens (consumed by webapp tailwind.config)
export {tokens} from './tokens/index.ts'
export type {Tokens} from './tokens/index.ts'
export type {CategoryColorKey, TierColorKey} from './tokens/colors.ts'

// Resource icon primitive
export {
    resourceIcon,
    resourceIconBody,
    resourceIconCategories,
    resourceIconSvg,
} from './primitives/resource-icon.ts'
export type {ResourceIconInlineOpts, ResourceIconSvgOpts} from './primitives/resource-icon.ts'

// Component icon primitive
export {
    componentIcon,
    componentIconBody,
    componentIconSlugs,
    componentIconSlugForName,
    componentIconSvg,
} from './primitives/component-icon.ts'
export type {
    ComponentIconInlineOpts,
    ComponentIconSlug,
    ComponentIconSvgOpts,
} from './primitives/component-icon.ts'

// Entity icon primitive
export {
    entityIcon,
    entityIconBody,
    entityIconSlugs,
    entityIconSlugForName,
    entityIconSvg,
} from './primitives/entity-icon.ts'
export type {
    EntityIconInlineOpts,
    EntityIconSlug,
    EntityIconSvgOpts,
} from './primitives/entity-icon.ts'

// Module icon primitive
export {
    moduleIcon,
    moduleIconBody,
    moduleIconSlugs,
    moduleIconSlugForName,
    moduleIconSlugForType,
    moduleIconSvg,
} from './primitives/module-icon.ts'
export type {
    ModuleIconInlineOpts,
    ModuleIconSlug,
    ModuleIconSvgOpts,
} from './primitives/module-icon.ts'

// Item cell templates
export {renderItemCell, itemCellGroup, abbreviateQuantity} from './templates/item-cell.ts'
export type {ItemCellProps, ItemCellGroupProps} from './templates/item-cell.ts'

// Social card template (1200x630 OG image)
export {
    socialCardSvg,
    SOCIAL_CARD_WIDTH,
    SOCIAL_CARD_HEIGHT,
} from './templates/social-card.ts'

// Ship panel template
export {renderShipPanel} from './templates/ship-panel.ts'
export type {ShipPanelProps, ShipPanelSlot} from './templates/ship-panel.ts'

// Re-exports from sdkv2 so consumers only need one import boundary
export {
    resolveItem,
    ServerContract,
    type ResolvedItem,
    type ResolvedItemStat,
    type ResolvedItemType,
    type ResolvedModuleSlot,
    type ResolvedAttributeGroup,
} from '@shipload/sdk'
