import {Name, type NameType} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Player} from '../entities/player'

export interface PlayerRosterEntry {
    owner: Name
    company?: string
}

export class PlayersManager extends BaseManager {
    async getPlayer(account: NameType): Promise<Player | undefined> {
        const playerRow = await this.server.table('player').get(Name.from(account))
        if (!playerRow) {
            return undefined
        }
        return new Player(playerRow)
    }

    async getPlayers(): Promise<Player[]> {
        const rows = await this.server.table('player').all()
        return rows.map((row) => new Player(row))
    }

    async getRoster(): Promise<PlayerRosterEntry[]> {
        const [players, companies] = await Promise.all([
            this.server.table('player').all(),
            this.platform.table('company').all(),
        ])
        const companyNames = new Map<string, string>()
        for (const company of companies) {
            companyNames.set(company.account.toString(), company.name)
        }
        return players.map((player) => ({
            owner: player.owner,
            company: companyNames.get(player.owner.toString()),
        }))
    }
}
