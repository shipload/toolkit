export interface ActionDispatcherOpts {
    timeoutMs: number
}

export type ActionResult = {ok: true} | {ok: false; error: string}

export class ActionDispatcher {
    private inflight = false

    constructor(private readonly opts: ActionDispatcherOpts) {}

    isBusy(): boolean {
        return this.inflight
    }

    async run(_label: string, fn: () => Promise<void>): Promise<ActionResult> {
        if (this.inflight) {
            return {ok: false, error: 'another action is in flight'}
        }
        this.inflight = true
        let timer: ReturnType<typeof setTimeout> | null = null
        try {
            const timeout = new Promise<ActionResult>((resolve) => {
                timer = setTimeout(
                    () => resolve({ok: false, error: 'action timed out'}),
                    this.opts.timeoutMs
                )
            })
            const work = (async (): Promise<ActionResult> => {
                try {
                    await fn()
                    return {ok: true}
                } catch (err) {
                    return {
                        ok: false,
                        error: err instanceof Error ? err.message : String(err),
                    }
                }
            })()
            return await Promise.race([work, timeout])
        } finally {
            if (timer) clearTimeout(timer)
            this.inflight = false
        }
    }
}
