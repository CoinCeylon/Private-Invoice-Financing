import { ChevronDown, Copy, Unplug, Wallet } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { copyToClipboard } from '../lib/clipboard'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

export type WalletConnection =
  | { status: 'disconnected' }
  | { status: 'connected'; address: string; label: string }

interface WalletButtonProps {
  connection: WalletConnection
  onConnect: () => void
  onDisconnect: () => void
}

export function WalletButton({ connection, onConnect, onDisconnect }: WalletButtonProps) {
  const button = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)

  useLayoutEffect(() => {
    if (restoreFocus.current) {
      button.current?.focus()
      restoreFocus.current = false
    }
  }, [connection.status])

  function changeConnection(change: () => void) {
    restoreFocus.current = true
    change()
  }

  if (connection.status === 'disconnected') {
    return (
      <Button variant="primary" className="wallet-button" ref={button} onClick={() => changeConnection(onConnect)}>
        <Wallet aria-hidden="true" />
        Connect wallet
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="wallet-button" ref={button} aria-label="Wallet connected, open wallet menu">
          <Wallet aria-hidden="true" />
          <span>Wallet connected</span>
          <ChevronDown className="menu-chevron" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{connection.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void copyToClipboard(connection.address, 'Wallet address')}>
          <Copy aria-hidden="true" /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => changeConnection(onDisconnect)}>
          <Unplug aria-hidden="true" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
