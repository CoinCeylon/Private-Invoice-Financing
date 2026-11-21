import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<'button'> & {
  asChild?: boolean
  variant?: 'outline' | 'ghost' | 'primary'
}

export function Button({
  asChild = false,
  className,
  variant = 'outline',
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ')

  if (asChild) {
    return <Slot.Root data-slot="button" className={classes} {...props} />
  }

  return <button data-slot="button" type={type} className={classes} {...props} />
}
