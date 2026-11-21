import { z } from 'zod'
import { parseMinorUnits } from '../../lib/money'

export const positiveAmount = z.string().refine((value) => {
  const minor = parseMinorUnits(value)
  return minor !== null && minor > 0
}, 'Enter a positive amount with up to two decimal places.')

export const rate = z.string().refine((value) => {
  const bps = parseMinorUnits(value)
  return bps !== null && bps <= 10_000
}, 'Enter a percentage from 0 to 100 with up to two decimal places.')
