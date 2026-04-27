import {Name, type NameType} from '@wharfkit/antelope'
import {BaseManager} from './base'
import {Player} from '../entities/player'

export class PlayersManager extends BaseManager {
    async getPlayer(account: NameType): Promise<Player | undefined> {
        const playerRow = await this.server.table('player').get(Name.from(account))
        if (!playerRow) {
            return undefined
        }
        return new Player(playerRow)
    }
}
