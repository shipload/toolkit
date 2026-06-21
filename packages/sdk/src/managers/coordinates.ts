import {BaseManager} from './base'
import {type CoordinateAddress, decodeAddress, encodeAddressMemo} from '../coordinates'

export class CoordinatesManager extends BaseManager {
    async encode(x: number, y: number): Promise<CoordinateAddress> {
        const game = await this.getGame()
        return encodeAddressMemo(game.config.seed, x, y)
    }

    async decode(addr: CoordinateAddress): Promise<{x: number; y: number}> {
        const game = await this.getGame()
        return decodeAddress(game.config.seed, addr)
    }
}
