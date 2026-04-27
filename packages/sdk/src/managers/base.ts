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

    protected async getGame() {
        return this.context.getGame()
    }

    protected async getState() {
        return this.context.getState()
    }
}
