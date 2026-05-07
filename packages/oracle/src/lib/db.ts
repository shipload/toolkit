import {Database} from 'bun:sqlite'
import {Bytes, Checksum256, PrivateKey} from '@wharfkit/antelope'

import {env} from './env'

interface SecretRow {
    epoch: number
    commitValue: string
    revealValue: string
}

const db = new Database(`shared/shipload.${env.accountName}.sqlite`)

db.run(`CREATE TABLE IF NOT EXISTS secrets (
    epoch INTEGER PRIMARY KEY,
    commitValue TEXT NOT NULL,
    revealValue TEXT NOT NULL
)`)

const selectSecret = db.query<SecretRow, {$epoch: number}>(
    'SELECT epoch, commitValue, revealValue FROM secrets WHERE epoch=$epoch'
)
const insertSecret = db.prepare<
    void,
    {$epoch: number; $commitValue: string; $revealValue: string}
>('INSERT INTO secrets (epoch, commitValue, revealValue) VALUES($epoch, $commitValue, $revealValue)')

export interface Secret {
    commit: Checksum256
    reveal: Checksum256
}

export function getOrCreateSecret(epoch: number): Secret {
    const existing = selectSecret.get({$epoch: epoch})
    if (existing) {
        return {
            commit: Checksum256.from(existing.commitValue),
            reveal: Checksum256.from(existing.revealValue),
        }
    }
    const secret = String(PrivateKey.generate('K1'))
    const reveal = Checksum256.hash(Bytes.from(secret, 'utf8').array)
    const commit = Checksum256.hash(Bytes.from(reveal.hexString, 'utf8').array)
    insertSecret.run({
        $epoch: epoch,
        $commitValue: commit.hexString,
        $revealValue: reveal.hexString,
    })
    return {commit, reveal}
}

export function getReveal(epoch: number): Checksum256 | undefined {
    const row = selectSecret.get({$epoch: epoch})
    return row ? Checksum256.from(row.revealValue) : undefined
}

export function closeDb() {
    db.close()
}
