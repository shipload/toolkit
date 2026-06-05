import type {GameContext} from './context'

export abstract class BaseManager {
    constructor(protected readonly context: GameContext) {}

    protected get client() {
        return this.context.client
    }

    protected get server() {
        return this.context.server
    }

    protected get platform() {
        return this.context.platform
    }

    protected get atomicAssetsAccount() {
        return this.context.atomicAssetsAccount
    }

    protected async getGame() {
        return this.context.getGame()
    }

    protected async getState(reload = false) {
        return this.context.getState(reload)
    }
}
