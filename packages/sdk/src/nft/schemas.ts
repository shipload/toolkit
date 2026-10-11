import schemasJson from '../data/schemas.json'
import type {SchemaField} from './atomicdata'

export interface WrappedSchema {
    name: string
    fields: SchemaField[]
}

const WRAPPED_SCHEMAS: WrappedSchema[] = schemasJson.schemas
const SCHEMA_BY_NAME = new Map(WRAPPED_SCHEMAS.map((schema) => [schema.name, schema]))
const SCHEMA_NAME_BY_ITEM = new Map(schemasJson.templates.map((t) => [t.itemId, t.schema]))

export function getWrappedSchemas(): WrappedSchema[] {
    return WRAPPED_SCHEMAS
}

export function getWrappedSchema(itemId: number): WrappedSchema | undefined {
    const name = SCHEMA_NAME_BY_ITEM.get(itemId)
    return name === undefined ? undefined : SCHEMA_BY_NAME.get(name)
}

export function getWrappedSchemaItemIds(schemaName: string): number[] {
    return schemasJson.templates.filter((t) => t.schema === schemaName).map((t) => t.itemId)
}

export function wrappedSchemaStatFields(schema: WrappedSchema): string[] {
    const names = schema.fields.map((f) => f.name)
    return names.slice(names.indexOf('quantity') + 1, names.indexOf('stats'))
}
