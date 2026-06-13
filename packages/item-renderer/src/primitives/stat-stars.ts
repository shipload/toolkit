import {el} from './svg.ts'

// 24×24 path, identical to the webapp ItemStatRow star.
const STAR_PATH =
    'M12 2.2l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 17.23 6.09 20.36l1.13-6.57L2.45 9.14l6.6-.96z'

export const STAR_SIZE = 9
export const STAR_GAP = 1
export const MAX_STARS = 3
export const STAR_BLOCK_WIDTH = MAX_STARS * STAR_SIZE + (MAX_STARS - 1) * STAR_GAP

const ON_COLOR = '#ffce5c'
const EMPTY_COLOR = 'rgba(255,255,255,0.16)'
const SCALE = STAR_SIZE / 24

export interface StatStarsProps {
    x: number // left edge of the star block
    y: number // vertical center the stars should sit on (text baseline)
    n: number
}

// Draws MAX_STARS glyphs left-to-right starting at x; the first `n` are filled.
export function statStars({x, y, n}: StatStarsProps): string {
    const filled = Math.max(0, Math.min(MAX_STARS, Math.floor(n)))
    const top = y - STAR_SIZE + 1 // center the glyph on the text baseline
    let out = ''
    for (let i = 0; i < MAX_STARS; i++) {
        const gx = x + i * (STAR_SIZE + STAR_GAP)
        out += el('path', {
            d: STAR_PATH,
            transform: `translate(${gx} ${top}) scale(${SCALE})`,
            fill: i < filled ? ON_COLOR : EMPTY_COLOR,
        })
    }
    return out
}
