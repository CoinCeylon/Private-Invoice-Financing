export const roles = ['supplier', 'buyer', 'lender-a', 'lender-b'] as const

export type Role = (typeof roles)[number]

export const participants = {
  supplier: { name: 'Gampaha Packaging', role: 'Supplier', initials: 'GP', invoiceNav: 'My invoices' },
  buyer: { name: 'Market Buyer', role: 'Buyer', initials: 'MB', invoiceNav: 'Approvals' },
  'lender-a': { name: 'Lender A', role: 'Lender', initials: 'LA', invoiceNav: 'Listing board' },
  'lender-b': { name: 'Lender B', role: 'Lender', initials: 'LB', invoiceNav: 'Listing board' },
} satisfies Record<Role, { name: string; role: string; initials: string; invoiceNav: string }>

export function isRole(value: unknown): value is Role {
  return roles.some((role) => role === value)
}

export type LenderRole = Extract<Role, 'lender-a' | 'lender-b'>

export function isLender(role: Role): role is LenderRole {
  return role === 'lender-a' || role === 'lender-b'
}
