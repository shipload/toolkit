import {createInterface} from 'node:readline/promises'

/**
 * Ask a yes/no question on the terminal. Returns true if the user answers yes.
 * - If `assumeYes` is true, returns true without prompting (--yes).
 * - If stdin is not a TTY (piped/CI), returns false (fail closed — never auto-approve).
 */
export async function confirm(question: string, assumeYes = false): Promise<boolean> {
    if (assumeYes) return true
    if (!process.stdin.isTTY) {
        console.error('Refusing to proceed without confirmation (no TTY). Re-run with --yes to skip the prompt.')
        return false
    }
    const rl = createInterface({input: process.stdin, output: process.stdout})
    try {
        const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase()
        return answer === 'y' || answer === 'yes'
    } finally {
        rl.close()
    }
}
