import {formatMass} from '@shipload/sdk'
import type {ShuttleReason} from '@shipload/sdk'
import {formatDateTimeUTC} from './format'

export function formatShuttleReason(r: ShuttleReason): string {
    const at = r.at ? formatDateTimeUTC(r.at) : undefined
    const until = r.until ? formatDateTimeUTC(r.until) : undefined
    switch (r.code) {
        case 'workshop-capped':
            return 'A pending change at the Workshop must finish before it can accept new jobs.'
        case 'ship-capped':
            return 'A pending change on the ship must finish before it can take this task.'
        case 'no-generator':
            return 'The ship needs a working energy source to book this job.'
        case 'not-equipped':
            return r.reason.includes('fabricator')
                ? 'The Workshop has no Fabricator installed.'
                : 'The Dock has no assembly arm installed.'
        case 'job-cap':
            return r.cap !== undefined
                ? `This building already has the maximum of ${r.cap} bookings waiting on materials; let one finish first.`
                : 'Too many bookings at this building are waiting on materials; let one finish first.'
        case 'target-busy':
            return 'The target is busy; it must be idle before this can proceed.'
        case 'cargo-wont-fit':
            return r.have !== undefined && r.need !== undefined
                ? `The target holds ${formatMass(r.have)}, which would not fit the upgraded capacity of ${formatMass(r.need)}.`
                : "The target's cargo would not fit the upgraded capacity."
        case 'depot-full':
            return r.have !== undefined && r.need !== undefined && r.cap !== undefined
                ? `You have ${formatMass(r.have)} stored at this depot; adding ${formatMass(r.need)} would pass the ${formatMass(r.cap)} limit for one player.`
                : 'This would pass the storage allowance for one player at this depot.'
        case 'not-stored':
            return r.have
                ? `You only have ${formatMass(r.have)} of that item stored at this depot.`
                : "You don't have that item stored at this depot."
        case 'no-storage':
            return 'This entity has no storage.'
        case 'bays-booked':
            return at
                ? `The building's shuttle bays are fully booked; the next opening is ${at}.`
                : "The building's shuttle bays are fully booked."
        case 'player-cap':
            return r.cap !== undefined
                ? `You already have the maximum of ${r.cap} transfers this building allows for one player${at ? `; the earliest one finishes ${at}` : ''}.`
                : 'You already have the most transfers this building allows for one player.'
        case 'queue-full':
            return at
                ? `The Fabricator queue is full; the next opening is ${at}.`
                : 'The Fabricator queue is full.'
        case 'inputs-unavailable':
            return at
                ? `The recipe's inputs won't be aboard by ${at}.`
                : "The recipe's inputs aren't available."
        case 'ship-energy':
            return r.have !== undefined && r.need !== undefined
                ? `This job needs ${r.need} energy; the ship will have ${r.have}.`
                : 'The ship does not have enough energy for this job.'
        case 'dropoff-collision':
            return at
                ? `An identical delivery is already scheduled to land at ${at}; let it finish, or change the shipment.`
                : 'An identical delivery is already scheduled; let it finish, or change the shipment.'
        case 'departs':
            return at && until
                ? `The ship departs at ${at}, before the delivery finishes at ${until}.`
                : 'The ship departs before the delivery finishes.'
        case 'cargo-not-aboard':
            return at
                ? `Not enough of this cargo will be free to send by ${at}.`
                : 'Not enough of this cargo is free to send.'
        case 'no-capacity':
            return r.need !== undefined
                ? `This delivery needs ${formatMass(r.need)} of free capacity${at ? ` by ${at}` : ''}.`
                : 'This delivery would exceed cargo capacity.'
        case 'schedule-full':
            return 'The schedule queue is full.'
        case 'plot-recipe':
            if (r.reason.includes('No recipe')) return 'No recipe is set for this plot target.'
            if (r.reason.includes('is not part')) return "This item isn't part of the plot's recipe."
            return "Depositing this would exceed what the plot's recipe needs."
        case 'not-ready':
            return at ? `This job finishes at ${at}.` : "This job isn't finished yet."
        default:
            return r.reason
    }
}
