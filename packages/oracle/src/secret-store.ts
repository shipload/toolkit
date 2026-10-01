import {Database} from 'bun:sqlite'
import {chmodSync, mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import {Bytes, Checksum256, PrivateKey} from '@wharfkit/antelope'

export interface Secret {
    commit: Checksum256
    reveal: Checksum256
}

export const UNKNOWN_CHAIN_ID = 'unknown'

interface SecretRow {
    epoch: number
    commitValue: string
    revealValue: string
    commitBlock: number | null
}

export interface SecretStoreDescription {
    chainId: string
    storedChainIds: string[]
    usable: boolean
    rows: number
}

export class StaleSecretStoreError extends Error {
    constructor(
        public readonly path: string,
        public readonly chainId: string,
        public readonly storedChainIds: string[]
    ) {
        const stored = storedChainIds.join(', ')
        super(
            `The secret store at ${path} holds rows tagged for ${stored}, not the chain this ` +
                `beacon is running against (${chainId}). Refusing to tick rather than guess. Run ` +
                '`shiploadcli oracle reset` to clear it, then restart the beacon.'
        )
        this.name = 'StaleSecretStoreError'
    }
}

export class SecretStore {
    private readonly db: Database
    private readonly path: string
    private readonly chainId: string
    private readonly selectStmt
    private readonly insertStmt
    private usable = true
    private storedChainIds: string[] = []

    constructor(path: string, chainId: string) {
        mkdirSync(dirname(path), {recursive: true, mode: 0o700})
        this.db = new Database(path)
        chmodSync(path, 0o600)
        this.path = path
        this.chainId = chainId.toLowerCase()
        this.migrateLegacySchema()
        this.db.run(`CREATE TABLE IF NOT EXISTS secrets (
            chainId TEXT NOT NULL,
            epoch INTEGER NOT NULL,
            commitValue TEXT NOT NULL,
            revealValue TEXT NOT NULL,
            commitBlock INTEGER,
            PRIMARY KEY (chainId, epoch)
        )`)
        this.selectStmt = this.db.query<SecretRow, {$chainId: string; $epoch: number}>(
            'SELECT epoch, commitValue, revealValue, commitBlock FROM secrets WHERE chainId=$chainId AND epoch=$epoch'
        )
        this.insertStmt = this.db.prepare<
            void,
            {$chainId: string; $epoch: number; $commitValue: string; $revealValue: string}
        >(
            'INSERT INTO secrets (chainId, epoch, commitValue, revealValue) VALUES($chainId, $epoch, $commitValue, $revealValue)'
        )
        this.refreshChainState()
    }

    private migrateLegacySchema(): void {
        const cols = this.db.query<{name: string}, []>('PRAGMA table_info(secrets)').all()
        if (cols.length === 0 || cols.some((c) => c.name === 'chainId')) return
        if (!cols.some((c) => c.name === 'commitBlock')) {
            this.db.run('ALTER TABLE secrets ADD COLUMN commitBlock INTEGER')
        }
        this.db.run('ALTER TABLE secrets RENAME TO secrets_legacy')
        this.db.run(`CREATE TABLE secrets (
            chainId TEXT NOT NULL,
            epoch INTEGER NOT NULL,
            commitValue TEXT NOT NULL,
            revealValue TEXT NOT NULL,
            commitBlock INTEGER,
            PRIMARY KEY (chainId, epoch)
        )`)
        this.db.run(
            `INSERT INTO secrets (chainId, epoch, commitValue, revealValue, commitBlock)
             SELECT ?, epoch, commitValue, revealValue, commitBlock FROM secrets_legacy`,
            [UNKNOWN_CHAIN_ID]
        )
        this.db.run('DROP TABLE secrets_legacy')
    }

    private refreshChainState(): void {
        const rows = this.db
            .query<{chainId: string}, []>('SELECT DISTINCT chainId FROM secrets')
            .all()
        this.storedChainIds = rows.map((r) => r.chainId)
        this.usable = this.storedChainIds.every((c) => c === this.chainId)
    }

    private assertUsable(): void {
        if (!this.usable) {
            throw new StaleSecretStoreError(this.path, this.chainId, this.storedChainIds)
        }
    }

    describe(): SecretStoreDescription {
        const row = this.db.query<{c: number}, []>('SELECT COUNT(*) as c FROM secrets').get()
        return {
            chainId: this.chainId,
            storedChainIds: this.storedChainIds,
            usable: this.usable,
            rows: row?.c ?? 0,
        }
    }

    reset(): void {
        this.db.run('DELETE FROM secrets')
        this.refreshChainState()
    }

    getOrCreate(epoch: number): Secret {
        this.assertUsable()
        const existing = this.selectStmt.get({$chainId: this.chainId, $epoch: epoch})
        if (existing) {
            return {
                commit: Checksum256.from(existing.commitValue),
                reveal: Checksum256.from(existing.revealValue),
            }
        }
        const entropy = String(PrivateKey.generate('K1'))
        const reveal = Checksum256.hash(Bytes.from(entropy, 'utf8').array)
        const commit = Checksum256.hash(reveal.array)
        this.insertStmt.run({
            $chainId: this.chainId,
            $epoch: epoch,
            $commitValue: commit.hexString,
            $revealValue: reveal.hexString,
        })
        this.refreshChainState()
        return {commit, reveal}
    }

    getReveal(epoch: number): Checksum256 | undefined {
        this.assertUsable()
        const row = this.selectStmt.get({$chainId: this.chainId, $epoch: epoch})
        return row ? Checksum256.from(row.revealValue) : undefined
    }

    getCommitBlock(epoch: number): number | undefined {
        this.assertUsable()
        const row = this.selectStmt.get({$chainId: this.chainId, $epoch: epoch})
        return row && row.commitBlock !== null ? row.commitBlock : undefined
    }

    recordCommitBlock(epoch: number, block: number): void {
        this.assertUsable()
        this.db.run('UPDATE secrets SET commitBlock=? WHERE chainId=? AND epoch=?', [
            block,
            this.chainId,
            epoch,
        ])
    }

    close(): void {
        this.db.close()
    }
}
