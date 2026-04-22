// Version
export const VERSION = '0.1.0'

// Errors
export { InvalidPayloadError, UnknownItemError, RenderError } from './errors.ts'

// Payload
export { encodePayload, decodePayload } from './payload/codec.ts'
export type { CargoItem, CargoItemLike } from './payload/codec.ts'

// Rendering
export { renderItem, renderFromPayload, type RenderOptions } from './render.ts'
export { renderByType, type RenderByTypeOpts } from './templates/index.ts'

// Links + meta
export { linkToItemPage, linkToItemImage } from './links.ts'
export { itemPageMeta, svgDimensions } from './meta.ts'
export type { ItemPageMeta, ItemPageMetaOptions } from './meta.ts'

// Tokens (consumed by testmap tailwind.config)
export { tokens } from './tokens/index.ts'
export type { Tokens, CategoryColorKey, TierColorKey } from './tokens/colors.ts'

// Category icon primitive
export { categoryIconSvg, categoryIconPath } from './primitives/category-icon.ts'
export type { CategoryIconPathOpts, CategoryIconSvgOpts } from './primitives/category-icon.ts'

// Item cell templates
export { renderItemCell, itemCellGroup } from './templates/item-cell.ts'
export type { ItemCellProps, ItemCellGroupProps } from './templates/item-cell.ts'

// Ship panel template
export { renderShipPanel } from './templates/ship-panel.ts'
export type { ShipPanelProps, ShipPanelSlot } from './templates/ship-panel.ts'

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
export type { CategoryIconShape } from '@shipload/sdk'
