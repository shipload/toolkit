import {Name, type NameType, Struct} from '@wharfkit/antelope'

export interface PlayerStateInput {
    owner: NameType
}

@Struct.type('player')
export class Player extends Struct {
    @Struct.field(Name)
    declare owner: Name

    static fromState(state: PlayerStateInput): Player {
        return Player.from({owner: Name.from(state.owner)})
    }
}
