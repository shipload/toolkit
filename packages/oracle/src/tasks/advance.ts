import {getOrCreateSecret, getReveal} from '../lib/db'
import {logger} from '../lib/logger'
import {session, shipload} from '../lib/wharf'

export async function advance() {
    logger.debug('Checking if epoch is ready to advance')
    const [state, current] = await Promise.all([
        shipload.getState(true),
        shipload.epochs.getCurrentHeight(),
    ])
    const currentHeight = Number(current)
    const stateEpoch = Number(state.epoch)
    if (currentHeight <= stateEpoch) return

    const {commit} = getOrCreateSecret(currentHeight)
    const reveal = getReveal(stateEpoch)
    if (!reveal) {
        logger.error('No reveal stored for current state.epoch — cannot advance', {stateEpoch})
        return
    }
    logger.info('Advancing to next epoch', {
        current: currentHeight,
        state: stateEpoch,
        commit: String(commit),
        reveal: String(reveal),
    })
    await session.transact({
        action: shipload.server.action('advance', {commit, reveal}),
    })
}
