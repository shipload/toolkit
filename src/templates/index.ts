import type { ResolvedItem } from '@shipload/sdk'
import type { CargoItem } from '../payload/codec.ts'
import { RenderError } from '../errors.ts'
import { renderResource } from './resource.ts'
import { renderPackedEntity } from './packed-entity.ts'
import { renderComponent } from './component.ts'
import { renderModule } from './module.ts'

export interface RenderByTypeOpts {
  mode?: 'values' | 'ranges'
}

export function renderByType(
  item: CargoItem,
  resolved: ResolvedItem,
  opts?: RenderByTypeOpts,
): string {
  switch (resolved.itemType) {
    case 'resource':
      return renderResource(item, resolved, opts)
    case 'entity':
      return renderPackedEntity(item, resolved)
    case 'component':
      return renderComponent(item, resolved, opts)
    case 'module':
      return renderModule(item, resolved, opts)
    default:
      throw new RenderError(`unknown itemType '${String(resolved.itemType)}'`)
  }
}
