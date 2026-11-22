import { DropdownMenu as Primitive } from 'radix-ui'
import type { ComponentProps } from 'react'

export const DropdownMenu = Primitive.Root
export const DropdownMenuTrigger = Primitive.Trigger
export const DropdownMenuRadioGroup = Primitive.RadioGroup
export const DropdownMenuItemIndicator = Primitive.ItemIndicator

export function DropdownMenuContent({
  align = 'end',
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content className="menu-content" align={align} sideOffset={8} {...props} />
    </Primitive.Portal>
  )
}

export function DropdownMenuRadioItem(props: ComponentProps<typeof Primitive.RadioItem>) {
  return <Primitive.RadioItem className="menu-item" {...props} />
}

export function DropdownMenuItem(props: ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item className="menu-item" {...props} />
}

export function DropdownMenuLabel(props: ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className="menu-label" {...props} />
}

export function DropdownMenuSeparator() {
  return <Primitive.Separator className="menu-separator" />
}
