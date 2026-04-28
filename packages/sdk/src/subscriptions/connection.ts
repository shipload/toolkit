import type {ClientMessage, ServerMessage} from './types'
import {debug} from './debug'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface WebSocketConnectionOptions {
    url: string
    onMessage: (message: ServerMessage) => void
    onStateChange?: (state: ConnectionState) => void
    minReconnectDelay?: number
    pingIntervalMs?: number
    pongTimeoutMs?: number
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
    private sendQueue: string[] = []
    private minReconnectDelay: number
    private pingIntervalMs: number
    private pongTimeoutMs: number
    private pingTimer: ReturnType<typeof setInterval> | null = null
    private staleTimer: ReturnType<typeof setTimeout> | null = null

    private static readonly DEFAULT_MIN_RECONNECT_DELAY = 1000
    private static readonly MAX_RECONNECT_DELAY = 30000
    private static readonly RECONNECT_MULTIPLIER = 2
    private static readonly DEFAULT_PING_INTERVAL_MS = 25000
    private static readonly DEFAULT_PONG_TIMEOUT_MS = 10000

    constructor(options: WebSocketConnectionOptions) {
        this.url = options.url
        this.onMessage = options.onMessage
        this.onStateChange = options.onStateChange
        this.minReconnectDelay =
            options.minReconnectDelay ?? WebSocketConnection.DEFAULT_MIN_RECONNECT_DELAY
        this.pingIntervalMs =
            options.pingIntervalMs ?? WebSocketConnection.DEFAULT_PING_INTERVAL_MS
        this.pongTimeoutMs =
            options.pongTimeoutMs ?? WebSocketConnection.DEFAULT_PONG_TIMEOUT_MS
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
        debug('Connecting to', this.url)

        try {
            this.ws = new WebSocket(this.url)

            this.ws.onopen = () => {
                debug('Connected')
                this.reconnectAttempts = 0
                this.setState('connected')
                while (
                    this.sendQueue.length > 0 &&
                    this.ws &&
                    this.ws.readyState === WebSocket.OPEN
                ) {
                    this.ws.send(this.sendQueue.shift()!)
                }
                this.startHeartbeat()
            }

            this.ws.onmessage = (event) => {
                this.resetStaleTimer()
                try {
                    const message = JSON.parse(event.data) as ServerMessage
                    this.onMessage(message)
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('[WS] Failed to parse message:', e)
                }
            }

            this.ws.onclose = () => {
                this.stopHeartbeat()
                this.ws = null
                this.sendQueue.length = 0

                if (this.shouldReconnect) {
                    this.setState('reconnecting')
                    this.scheduleReconnect()
                } else {
                    this.setState('disconnected')
                }
            }
        } catch (e) {
            // eslint-disable-next-line no-console
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
            this.minReconnectDelay *
                WebSocketConnection.RECONNECT_MULTIPLIER ** this.reconnectAttempts,
            WebSocketConnection.MAX_RECONNECT_DELAY
        )

        debug(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)

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

        this.stopHeartbeat()

        if (this.ws) {
            this.ws.close()
            this.ws = null
        }

        this.sendQueue.length = 0
        this.setState('disconnected')
    }

    private startHeartbeat() {
        this.stopHeartbeat()
        this.resetStaleTimer()
        this.pingTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({type: 'ping'}))
            }
        }, this.pingIntervalMs)
    }

    private stopHeartbeat() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer)
            this.pingTimer = null
        }
        if (this.staleTimer) {
            clearTimeout(this.staleTimer)
            this.staleTimer = null
        }
    }

    private resetStaleTimer() {
        if (this.staleTimer) clearTimeout(this.staleTimer)
        this.staleTimer = setTimeout(
            () => {
                debug('No frames within ping interval + pong timeout — forcing reconnect')
                if (this.ws) this.ws.close()
            },
            this.pingIntervalMs + this.pongTimeoutMs
        )
    }

    close() {
        this.disconnect()
    }

    send(message: ClientMessage) {
        const data = JSON.stringify(message)
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data)
            return
        }
        this.sendQueue.push(data)
    }

    get isConnected(): boolean {
        return this._state === 'connected'
    }
}
