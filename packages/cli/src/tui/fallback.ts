export interface TtyEnv {
    isTTY: boolean
    write: (s: string) => void
    exit: (code: number) => void
}

const REAL_ENV: TtyEnv = {
    get isTTY() {
        return !!process.stdout.isTTY
    },
    write: (s: string) => {
        process.stderr.write(s)
    },
    exit: (code: number) => {
        process.exit(code)
    },
}

export function assertTty(
    entityType: string,
    entityId: bigint | number,
    env: TtyEnv = REAL_ENV
): void {
    if (env.isTTY) return
    env.write(
        `shiploadcli ${entityType} ${entityId} track requires a TTY.\n` +
            `Use \`shiploadcli ${entityType} ${entityId} status\` for one-shot output.\n`
    )
    env.exit(2)
}
