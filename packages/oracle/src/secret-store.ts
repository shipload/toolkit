import {Database} from 'bun:sqlite'
import {chmodSync, mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import {Bytes, Checksum256, PrivateKey} from '@wharfkit/antelope'

export interface Secret {
    commit: Checksum256
    reveal: Checksum256
}

interface SecretRow {
    epoch: number
    commitValue: string
    revealValue: string
    commitBlock: number | null
}

export class SecretStore {
    private readonly db: Database
    private readonly selectStmt
    private readonly insertStmt

    constructor(path: string) {
        mkdirSync(dirname(path), {recursive: true, mode: 0o700})
        this.db = new Database(path)
        chmodSync(path, 0o600)
        this.db.run(`CREATE TABLE IF NOT EXISTS secrets (
            epoch INTEGER PRIMARY KEY,
            commitValue TEXT NOT NULL,
            revealValue TEXT NOT NULL,
            commitBlock INTEGER
        )`)
        const cols = this.db.query<{name: string}, []>('PRAGMA table_info(secrets)').all()
        if (!cols.some((c) => c.name === 'commitBlock')) {
            this.db.run('ALTER TABLE secrets ADD COLUMN commitBlock INTEGER')
        }
        this.selectStmt = this.db.query<SecretRow, {$epoch: number}>(
            'SELECT epoch, commitValue, revealValue, commitBlock FROM secrets WHERE epoch=$epoch'
        )
        this.insertStmt = this.db.prepare<
            void,
            {$epoch: number; $commitValue: string; $revealValue: string}
        >(
            'INSERT INTO secrets (epoch, commitValue, revealValue) VALUES($epoch, $commitValue, $revealValue)'
        )
    }

    getOrCreate(epoch: number): Secret {
        const existing = this.selectStmt.get({$epoch: epoch})
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
            $epoch: epoch,
            $commitValue: commit.hexString,
            $revealValue: reveal.hexString,
        })
        return {commit, reveal}
    }

    getReveal(epoch: number): Checksum256 | undefined {
        const row = this.selectStmt.get({$epoch: epoch})
        return row ? Checksum256.from(row.revealValue) : undefined
    }

    getCommitBlock(epoch: number): number | undefined {
        const row = this.selectStmt.get({$epoch: epoch})
        return row && row.commitBlock !== null ? row.commitBlock : undefined
    }

    recordCommitBlock(epoch: number, block: number): void {
        this.db.run('UPDATE secrets SET commitBlock=? WHERE epoch=?', [block, epoch])
    }

    close(): void {
        this.db.close()
    }
}
