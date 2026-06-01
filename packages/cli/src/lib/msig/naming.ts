const NAME_RE = /^[a-z1-5.]{1,12}$/

/** True if `name` is a valid Antelope name usable as an eosio.msig proposal_name. */
export function isValidProposalName(name: string): boolean {
    return NAME_RE.test(name)
}

const NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz12345'

/** Generate a random valid 12-character Antelope name (adapted from unicove). */
export function generateRandomName(length = 12): string {
    let name = ''
    for (let i = 0; i < length; i += 1) {
        name += NAME_CHARS.charAt(Math.floor(Math.random() * NAME_CHARS.length))
    }
    return name
}
