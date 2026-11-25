import { LockKeyhole } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { VisibleAmount } from '../lib/api'
import { formatMoney } from '../lib/money'

export function VeiledAmount({ amount }: { amount: VisibleAmount }) {
  const reduceMotion = useReducedMotion()

  if (amount.visibility === 'hidden') {
    return (
      <div className="veil">
        <span className="veil-bar" aria-hidden="true" />
        <span className="veil-label"><LockKeyhole aria-hidden="true" /> Hidden by zero-knowledge proof</span>
      </div>
    )
  }

  return (
    <motion.span
      className="mono amount-value"
      initial={reduceMotion ? false : { opacity: 0, filter: 'blur(4px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.22 }}
    >
      {formatMoney(amount.money)}
    </motion.span>
  )
}
