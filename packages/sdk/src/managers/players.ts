import {Name, type NameType} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Player} from '../entities/player'

export interface PlayerRosterEntry {
    owner: Name
    company?: string
}

export class PlayersManager extends BaseManager {
    async getPlayer(account: NameType): Promise<Player | undefined> {
        const company = await this.platform.table('company').get(Name.from(account))
        if (!company) {
            return undefined
        }
        return Player.fromState({owner: company.account})
    }

    async getPlayers(): Promise<Player[]> {
        const companies = await this.platform.table('company').all()
        return companies.map((company) => Player.fromState({owner: company.account}))
    }

    async getRoster(): Promise<PlayerRosterEntry[]> {
        const companies = await this.platform.table('company').all()
        return companies.map((company) => ({
            owner: company.account,
            company: company.name,
        }))
    }
}
