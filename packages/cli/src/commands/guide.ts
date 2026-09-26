import type {Command} from 'commander'
import GUIDE from '../guide.txt'

export function register(program: Command): void {
    program
        .command('guide')
        .description('Print the play guide: bootstrap, the session loop, and how to plan progress')
        .action(() => {
            process.stdout.write(GUIDE.endsWith('\n') ? GUIDE : `${GUIDE}\n`)
        })
}
