export const colors = {
  surface: {
    background: '#0a0a0c',
    panel: '#11141a',
    panelBorder: '#1e242e',
    panelBorderBright: '#2a3340',
  },
  text: {
    primary: '#e6e8ec',
    secondary: '#8f98a8',
    muted: '#5b6373',
    accent: '#f4c96b',
  },
  brand: {
    pink: '#ff4f9a',
    teal: '#2fd6d1',
    cyan: '#6cb9ff',
  },
  category: {
    metal: '#b5b9c2',
    gas: '#6cb9ff',
    mineral: '#b38aff',
    organic: '#58d08c',
    precious: '#f4c96b',
  },
  tier: {
    t1: '#8f98a8',
    t2: '#6cb9ff',
    t3: '#b38aff',
    t4: '#f4c96b',
    t5: '#ff4f9a',
  },
} as const

export type CategoryColorKey = keyof typeof colors.category
export type TierColorKey = keyof typeof colors.tier
