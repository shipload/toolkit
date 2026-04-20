import { colors } from './colors.ts'
import { spacing } from './spacing.ts'
import { typography } from './typography.ts'

export const tokens = { colors, spacing, typography } as const
export type Tokens = typeof tokens
export { colors, spacing, typography }
