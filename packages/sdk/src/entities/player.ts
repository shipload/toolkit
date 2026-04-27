import {Name, type NameType} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'

export interface PlayerStateInput {
    owner: NameType
}

export class Player extends ServerContract.Types.player_row {
    static fromState(state: PlayerStateInput): Player {
        const playerRow = ServerContract.Types.player_row.from({
            owner: Name.from(state.owner),
        })
        return new Player(playerRow)
    }
}
