import { createRootRoute, createRoute, createRouter, lazyRouteComponent } from '@tanstack/react-router'
import { isRole } from '../lib/roles'
import type { Role } from '../lib/roles'
import { WorkspaceRoute } from './app-shell'

const rootRoute = createRootRoute({
  validateSearch: (search: Record<string, unknown>): { role?: Role } => (
    isRole(search.role) ? { role: search.role } : {}
  ),
  component: WorkspaceRoute,
})

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./ledger-overview'), 'LedgerOverview'),
})

const invoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoices',
  component: lazyRouteComponent(() => import('../features/invoice/invoice-list'), 'InvoiceListPage'),
})

const settlementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settlement',
  component: lazyRouteComponent(() => import('../features/invoice/invoice-list'), 'InvoiceListPage'),
})

const defaultedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/defaulted',
  component: lazyRouteComponent(() => import('../features/invoice/invoice-list'), 'InvoiceListPage'),
})

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/upload',
  component: lazyRouteComponent(() => import('../features/supplier/upload-page'), 'UploadPage'),
})

const invoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invoice/$invoiceId',
  component: lazyRouteComponent(() => import('../features/invoice/invoice-detail'), 'InvoiceDetailPage'),
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    overviewRoute, invoicesRoute, settlementRoute, defaultedRoute, uploadRoute, invoiceRoute,
  ]),
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
