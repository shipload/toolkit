import type { ResolvedItem } from '@shipload/sdk'
import type { CargoItem } from '../payload/codec.ts'
import { RenderError } from '../errors.ts'
import { renderResource } from './resource.ts'
import { renderPackedEntity } from './packed-entity.ts'
import { renderComponent } from './component.ts'

export function renderByType(item: CargoItem, resolved: ResolvedItem): string {
  switch (resolved.itemType) {
    case 'resource':
      return renderResource(item, resolved)
    case 'entity':
      return renderPackedEntity(item, resolved)
    case 'component':
      return renderComponent(item, resolved)
    case 'module':
      throw new RenderError(
        `itemType '${resolved.itemType}' not supported in v1 (item ${resolved.itemId})`,
      )
    default:
      throw new RenderError(`unknown itemType '${String(resolved.itemType)}'`)
  }
}
