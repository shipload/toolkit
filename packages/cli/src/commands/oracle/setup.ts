import type {Command} from 'commander'
import {assertOracleHandle, loadOracleConfig} from '../../lib/config'
import {client, gameContractName, getShipload, server} from '../../lib/client'
import {
    defaultStorePath,
    hasExistingOracleKey,
    oracleConfigTarget,
    readConfigText,
    writeOracleKey,
} from './keygen'

export const ORACLE_GUIDE_URL = 'https://shiploadgame.com/guide/oracles'

const LABEL_WIDTH = 18

class SetupAbort extends Error {
    constructor(
        public readonly line: string,
        public readonly advice: string
    ) {
        super(advice)
        this.name = 'SetupAbort'
    }
}

export function checkLine(label: string, detail: string): string {
    return `${label.padEnd(LABEL_WIDTH)}... ${detail}`
}

export function renderPasteBlock(handle: string, pubkey: string): string {
    const rule = '-'.repeat(66)
    return [
        '',
        'Your oracle is set up. Send this to the game deployer:',
        '',
        `  ${rule}`,
        `  Oracle handle: ${handle}`,
        `  Public key:    ${pubkey}`,
        `  ${rule}`,
        '',
        `Next: ${ORACLE_GUIDE_URL}`,
        '',
        'Start the beacon now with `shiploadcli oracle run`. It waits until the',
        'deployer admits your handle, then starts committing on its own.',
    ].join('\n')
}

async function preflightChain(): Promise<number> {
    const stateRow = await server
        .table('state')
        .get()
        .catch((err: Error) => {
            throw new SetupAbort(
                checkLine('Checking Jungle 4', `unreachable (${err.message})`),
                'Setup needs the chain to check your handle. Nothing was written.'
            )
        })
    if (!stateRow) {
        throw new SetupAbort(
            checkLine('Checking Jungle 4', `${gameContractName} has no state row`),
            `The server contract on ${gameContractName} is not initialized. Nothing was written.`
        )
    }
    if (!stateRow.enabled) {
        throw new SetupAbort(
            checkLine('Checking Jungle 4', `${gameContractName} is not enabled`),
            'The server contract is deployed but disabled. Nothing was written.'
        )
    }
    try {
        const shipload = await getShipload()
        await shipload.epochs.getOracles()
    } catch (err) {
        throw new SetupAbort(
            checkLine(
                'Checking Jungle 4',
                `cannot read the oracle quorum on ${gameContractName} (${(err as Error).message})`
            ),
            'The oracle quorum is not deployed, or the chain did not answer. Nothing was written.'
        )
    }
    return Number(stateRow.epoch)
}

async function preflightHandle(handle: string): Promise<void> {
    const shipload = await getShipload()
    const [oracles, account] = await Promise.all([
        shipload.epochs.getOracles(),
        client.v1.chain.get_account(gameContractName),
    ]).catch((err: Error) => {
        throw new SetupAbort(
            checkLine('Checking handle', `could not read ${gameContractName} (${err.message})`),
            'Setup needs the chain to check your handle. Nothing was written.'
        )
    })
    if (oracles.some((o) => String(o.id) === handle)) {
        throw new SetupAbort(
            checkLine(
                'Checking handle',
                `'${handle}' is already registered on ${gameContractName}`
            ),
            'Pick a different handle. Nothing was written.'
        )
    }
    if (account.permissions.some((p) => String(p.perm_name) === handle)) {
        throw new SetupAbort(
            checkLine(
                'Checking handle',
                `'${handle}' already exists as a permission on ${gameContractName}`
            ),
            'Pick a different handle. Nothing was written.'
        )
    }
}

function storePathFor(handle: string): string {
    try {
        return loadOracleConfig().storePath
    } catch {
        return defaultStorePath(handle)
    }
}

export function register(parent: Command): void {
    parent
        .command('setup <handle>')
        .description(
            'Set up this machine as an oracle operator and print what to send the deployer'
        )
        .option('--force', 'overwrite an existing [oracle] private_key', false)
        .option('--cwd', 'write to ./config.ini instead of the user config dir', false)
        .action(async (handle: string, opts: {force: boolean; cwd: boolean}) => {
            assertOracleHandle(handle)
            const target = oracleConfigTarget(opts.cwd)
            const existing = readConfigText(target)
            if (hasExistingOracleKey(existing) && !opts.force) {
                console.error(
                    `An [oracle] private_key already exists in ${target}. Re-run with --force to overwrite.`
                )
                process.exitCode = 1
                return
            }
            console.log('')
            try {
                const epoch = await preflightChain()
                console.log(
                    checkLine(
                        'Checking Jungle 4',
                        `reachable (${gameContractName}, epoch ${epoch})`
                    )
                )
                await preflightHandle(handle)
                console.log(checkLine('Checking handle', `'${handle}' is free`))
            } catch (err) {
                if (err instanceof SetupAbort) {
                    console.log(err.line)
                    console.log('')
                    console.error(err.advice)
                    process.exitCode = 1
                    return
                }
                throw err
            }
            const pubkey = writeOracleKey(target, existing, handle)
            console.log(checkLine('Generating key', `written to ${target} (mode 0600)`))
            console.log(checkLine('Reveal store', storePathFor(handle)))
            console.log(renderPasteBlock(handle, pubkey))
        })
}
