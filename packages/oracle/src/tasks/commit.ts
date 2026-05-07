import {Checksum256} from '@wharfkit/antelope'

import {getOrCreateSecret} from '../lib/db'
import {logger} from '../lib/logger'
import {session, shipload} from '../lib/wharf'

const ZERO_COMMIT = Checksum256.from(new Uint8Array(32))

export async function initialCommit() {
    logger.debug('Checking if initial commit was set')
    const state = await shipload.getState(true)
    if (!state.commit.equals(ZERO_COMMIT)) {
        logger.debug('No initial commit required.')
        return
    }
    const {commit, reveal} = getOrCreateSecret(Number(state.epoch))
    logger.info('Setting initial commit before game starts.', {
        commit: String(commit),
        reveal: String(reveal),
    })
    await session.transact({
        action: shipload.server.action('commit', {commit}),
    })
}
