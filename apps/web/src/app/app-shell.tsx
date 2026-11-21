import { Link, Outlet, useLocation, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  Check,
  ChevronDown,
  FileText,
  FilePlus2,
  CircleAlert,
  Landmark,
  Layers,
  LayoutGrid,
  Moon,
  Sun,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Toaster } from 'sonner'
import { Button } from '../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { WalletButton } from '../components/wallet-button'
import type { WalletConnection } from '../components/wallet-button'
import { isRole, participants, roles } from '../lib/roles'
import type { Role } from '../lib/roles'

const demoWallet = {
  status: 'connected',
  address: 'addr_test1_demo_invoice_veil',
  label: 'Demo wallet',
} satisfies WalletConnection

interface AppShellProps {
  role: Role
  onRoleChange: (role: Role) => void
}

function RoleSwitcher({ role, onRoleChange }: AppShellProps) {
  const participant = participants[role]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="role-trigger" aria-label={`${participant.name}, ${participant.role}. Switch role`}>
          <span className="role-avatar" aria-hidden="true">{participant.initials}</span>
          <span className="role-trigger-text">
            <span className="role-organization">{participant.name}</span>
            <span className="role-title">{participant.role}</span>
          </span>
          <ChevronDown className="menu-chevron" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Switch demo role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={role} onValueChange={(value) => {
          if (isRole(value)) onRoleChange(value)
        }}>
          {roles.map((option) => (
            <DropdownMenuRadioItem value={option} key={option}>
              <span className="role-avatar" aria-hidden="true">{participants[option].initials}</span>
              <span className="role-trigger-text">
                <span className="role-organization">{participants[option].name}</span>
                <span className="role-title">{participants[option].role}</span>
              </span>
              <DropdownMenuItemIndicator className="role-indicator">
                <Check aria-hidden="true" />
              </DropdownMenuItemIndicator>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  try {
    const preference = localStorage.getItem('invoice-veil-theme')
    if (preference === 'light' || preference === 'dark') return preference
  } catch {
    // The system preference still applies when storage is unavailable.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function AppShell({ role, onRoleChange }: AppShellProps) {
  const [wallet, setWallet] = useState<WalletConnection>(demoWallet)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const participant = participants[role]
  const pathname = useLocation({ select: (location) => location.pathname })
  const lastPath = useRef(pathname)
  const main = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutGrid },
    { to: '/invoices', label: participant.invoiceNav, icon: FileText },
    ...(role === 'supplier' ? [{ to: '/upload', label: 'Upload invoice', icon: FilePlus2 } as const] : []),
    { to: '/settlement', label: role === 'buyer' ? 'Payments' : role === 'supplier' ? 'Settlement' : 'Financing & settlement', icon: Landmark },
    { to: '/defaulted', label: 'Defaulted', icon: CircleAlert },
  ] as const

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    try {
      localStorage.setItem('invoice-veil-theme', nextTheme)
    } catch {
      // The theme can still be changed for the current session.
    }
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="topbar">
        <Link to="/" search={{ role }} className="brand">
          <span className="brand-mark" aria-hidden="true"><Layers /></span>
          <span>invoice<span className="brand-hyphen">-</span>veil</span>
        </Link>
        <div className="topbar-controls">
          <RoleSwitcher role={role} onRoleChange={onRoleChange} />
          <span className="topbar-divider" aria-hidden="true" />
          <span className="network-badge"><span className="status-dot" aria-hidden="true" /> Testnet</span>
          <WalletButton
            connection={wallet}
            onConnect={() => setWallet(demoWallet)}
            onDisconnect={() => setWallet({ status: 'disconnected' })}
          />
        </div>
      </header>

      <aside className="sidebar">
        <nav aria-label={`${participant.role} workspace`}>
          <p className="eyebrow sidebar-caption">Workspace</p>
          {navItems.map((item) => (
            <Link
              className="sidebar-link"
              to={item.to}
              search={{ role }}
              activeOptions={{ exact: true, includeSearch: false }}
              key={item.to}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-networks">
            <p className="eyebrow">Networks</p>
            <span><span className="network-node" aria-hidden="true" /> Cardano preprod</span>
            <span><span className="network-node" aria-hidden="true" /> Midnight</span>
          </div>
          <Button variant="ghost" className="theme-button" onClick={toggleTheme} aria-pressed={theme === 'dark'}>
            {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            Night ledger
          </Button>
        </div>
      </aside>

      <main ref={main} id="main-content" className="workspace" tabIndex={-1}>
        <Outlet />
      </main>
      <Toaster theme={theme} position="bottom-right" />
    </div>
  )
}

export function WorkspaceRoute() {
  const { role = 'supplier' } = useSearch({ from: '__root__' })
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { invoiceId } = useParams({ strict: false })

  function changeRole(nextRole: Role) {
    const search = { role: nextRole }
    if (invoiceId) {
      void navigate({ to: '/invoice/$invoiceId', params: { invoiceId }, search, resetScroll: false })
      return
    }

    const to = pathname === '/upload' || pathname === '/invoices' ? '/invoices'
      : pathname === '/settlement' || pathname === '/defaulted' ? pathname : '/'
    void navigate({ to, search })
  }

  return <AppShell role={role} onRoleChange={changeRole} />
}
