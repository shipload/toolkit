import {getOrCreateSecret} from '../src/lib/db'

const epoch = Number(process.argv[2])
if (!Number.isInteger(epoch) || epoch < 0) {
    console.error('Usage: bun scripts/seed-secret.ts <epoch>')
    process.exit(1)
}

const {commit, reveal} = getOrCreateSecret(epoch)
console.log(JSON.stringify({epoch, commit: String(commit), reveal: String(reveal)}, null, 2))
