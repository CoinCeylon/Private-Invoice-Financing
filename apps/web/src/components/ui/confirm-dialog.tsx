import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { Button } from './button'

export function ConfirmDialog({ trigger, title, description, confirm, onConfirm }: {
  trigger: ReactNode
  title: string
  description: string
  confirm: string
  onConfirm: () => void
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <div className="action-row">
            <Dialog.Close asChild><Button>Cancel</Button></Dialog.Close>
            <Dialog.Close asChild><Button variant="primary" onClick={onConfirm}>{confirm}</Button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
