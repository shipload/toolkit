import type {ResourceCategory} from '../types'

export const categoryColors: Record<ResourceCategory, string> = {
    ore: '#C26D3F',
    crystal: '#4ADBFF',
    gas: '#B877FF',
    regolith: '#C4A57B',
    biomass: '#5A8B3E',
}

export const tierColors: Record<number, string> = {
    1: '#8b8b8b',
    2: '#4ade80',
    3: '#818cf8',
    4: '#c084fc',
    5: '#fbbf24',
    6: '#f97316',
    7: '#ef4444',
    8: '#ec4899',
    9: '#06b6d4',
    10: '#ffffff',
}

export const componentIcon = '▣'
export const moduleIcon = '⬢'

export const itemAbbreviations: Record<number, string> = {
    10001: 'PL',
    10002: 'FR',
    10003: 'PC',
    10004: 'RS',
    10005: 'BM',
    10006: 'SN',
    10007: 'PM',
    10008: 'CR',
    10009: 'RX',
    10010: 'EM',
    10100: 'EN',
    10101: 'GN',
    10102: 'EX',
    10103: 'LD',
    10104: 'MF',
    10105: 'ST',
    10106: 'HL',
    10107: 'WP',
    10200: 'CT',
    10201: 'SH',
    10202: 'WH',
    20001: 'PL',
    20002: 'FR',
    20200: 'CT',
}
