import type {ClientMessage, ServerMessage} from './types'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface WebSocketConnectionOptions {
    url: string
    onMessage: (message: ServerMessage) => void
    onStateChange?: (state: ConnectionState) => void
}

export class WebSocketConnection {
    private ws: WebSocket | null = null
    private url: string
    private onMessage: (message: ServerMessage) => void
    private onStateChange?: (state: ConnectionState) => void
    private reconnectAttempts = 0
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    private _state: ConnectionState = 'disconnected'
    private shouldReconnect = true

    private static readonly MIN_RECONNECT_DELAY = 1000
    private static readonly MAX_RECONNECT_DELAY = 30000
    private static readonly RECONNECT_MULTIPLIER = 2

    constructor(options: WebSocketConnectionOptions) {
        this.url = options.url
        this.onMessage = options.onMessage
        this.onStateChange = options.onStateChange
    }

    get state(): ConnectionState {
        return this._state
    }

    private setState(state: ConnectionState) {
        if (this._state !== state) {
            this._state = state
            this.onStateChange?.(state)
        }
    }

    connect() {
        if (this.ws) {
            return
        }

        this.shouldReconnect = true
        this.setState('connecting')
        console.log('[WS] Connecting to', this.url)

        try {
            this.ws = new WebSocket(this.url)

            this.ws.onopen = () => {
                console.log('[WS] Connected')
                this.reconnectAttempts = 0
                this.setState('connected')
            }

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data) as ServerMessage
                    this.onMessage(message)
                } catch (e) {
                    console.error('[WS] Failed to parse message:', e)
                }
            }

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error)
            }

            this.ws.onclose = () => {
                this.ws = null

                if (this.shouldReconnect) {
                    this.setState('reconnecting')
                    this.scheduleReconnect()
                } else {
                    this.setState('disconnected')
                }
            }
        } catch (e) {
            console.error('[WS] Failed to create connection:', e)
            this.ws = null
            if (this.shouldReconnect) {
                this.setState('reconnecting')
                this.scheduleReconnect()
            }
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) {
            return
        }

        const delay = Math.min(
            WebSocketConnection.MIN_RECONNECT_DELAY *
                Math.pow(WebSocketConnection.RECONNECT_MULTIPLIER, this.reconnectAttempts),
            WebSocketConnection.MAX_RECONNECT_DELAY
        )

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null
            this.reconnectAttempts++
            this.connect()
        }, delay)
    }

    disconnect() {
        this.shouldReconnect = false

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
        }

        if (this.ws) {
            this.ws.close()
            this.ws = null
        }

        this.setState('disconnected')
    }

    close() {
        this.disconnect()
    }

    send(message: ClientMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message))
        } else {
            console.warn('[WS] Cannot send message, not connected')
        }
    }

    get isConnected(): boolean {
        return this._state === 'connected'
    }
}
