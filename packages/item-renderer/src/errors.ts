export class InvalidPayloadError extends Error {
    override readonly name = 'InvalidPayloadError'
    constructor(message: string) {
        super(message)
    }
}

export class UnknownItemError extends Error {
    override readonly name = 'UnknownItemError'
    readonly itemId: number
    constructor(itemId: number) {
        super(`unknown item id: ${itemId}`)
        this.itemId = itemId
    }
}

export class RenderError extends Error {
    override readonly name = 'RenderError'
    constructor(message: string, options?: {cause?: unknown}) {
        super(message, options)
    }
}
