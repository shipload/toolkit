import type {Item} from '$lib'
import {__registerItemInternal as rawRegister} from 'src/items'

const mockedIds = new Set<number>()

export function registerMockItem(item: Item): void {
    mockedIds.add(item.id)
    rawRegister(item)
}

export function clearMockItems(): void {
    mockedIds.clear()
}
