import {AsyncTask, SimpleIntervalJob, ToadScheduler} from 'toad-scheduler'

import {closeDb} from './lib/db'
import {logger} from './lib/logger'
import {advance} from './tasks/advance'
import {initialCommit} from './tasks/commit'

const scheduler = new ToadScheduler()

async function main() {
    logger.info('Starting shipload oracle service')
    await initialCommit()

    const advanceTask = new AsyncTask('advance', advance, (err: Error) =>
        logger.error('advance task failed', {error: err.message, stack: err.stack})
    )
    scheduler.addSimpleIntervalJob(
        new SimpleIntervalJob({seconds: 10, runImmediately: true}, advanceTask)
    )
}

function ensureExit(code: number, timeout = 3000) {
    process.exitCode = code
    setTimeout(() => {
        scheduler.stop()
        closeDb()
        process.exit(code)
    }, timeout)
}

process.once('uncaughtException', (error) => {
    logger.error('uncaughtException', {error: error.message, stack: error.stack})
    ensureExit(1)
})

main().catch((error) => {
    logger.error('main failed', {error: error.message, stack: error.stack})
    ensureExit(1)
})
