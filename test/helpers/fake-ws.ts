export class FakeWebSocketServer {
    private readonly messages: string[] = []
    private readonly resolvers: Array<(msg: any) => void> = []
    private incoming: ((data: string) => void) | null = null
    public readonly url = 'ws://fake/'
    private prevWS: any

    constructor() {
        this.prevWS = (globalThis as any).WebSocket
        ;(globalThis as any).WebSocket = this.createFakeCtor()
    }

    nextMessage(): Promise<any> {
        if (this.messages.length > 0) {
            return Promise.resolve(JSON.parse(this.messages.shift()!))
        }
        return new Promise((resolve) => this.resolvers.push(resolve))
    }

    send(msg: any) {
        if (this.incoming) this.incoming(JSON.stringify(msg))
    }

    close() {
        ;(globalThis as any).WebSocket = this.prevWS
    }

    private createFakeCtor() {
        const fake = this
        return class FakeWebSocket {
            static readonly CONNECTING = 0
            static readonly OPEN = 1
            static readonly CLOSING = 2
            static readonly CLOSED = 3

            readyState = 1
            onmessage: ((e: {data: string}) => void) | null = null
            onopen: (() => void) | null = null
            onclose: (() => void) | null = null
            onerror: ((e?: any) => void) | null = null

            constructor(public url: string) {
                fake.incoming = (data) => this.onmessage?.({data})
                setTimeout(() => this.onopen?.(), 0)
            }
            send(data: string) {
                fake.messages.push(data)
                const r = fake.resolvers.shift()
                if (r) r(JSON.parse(data))
            }
            close() {
                this.readyState = 3
                this.onclose?.()
            }
        }
    }
}
