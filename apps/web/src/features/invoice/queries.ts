import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { InvoiceAction } from '../../lib/api'
import { invoiceVeilApi } from '../../lib/mock-api'
import type { Role } from '../../lib/roles'

export function useInvoices(role: Role) {
  return useQuery({
    queryKey: ['invoices', role],
    queryFn: ({ signal }) => invoiceVeilApi.listInvoices(role, signal),
    refetchInterval: ({ state }) => state.data?.some((invoice) => invoice.needsUpdate) ? 800 : false,
    retry: false,
  })
}

export function useInvoice(role: Role, id: string) {
  return useQuery({
    queryKey: ['invoice', id, role],
    queryFn: ({ signal }) => invoiceVeilApi.getInvoice(role, id, signal),
    refetchInterval: ({ state }) => state.data?.needsUpdate ? 800 : false,
    retry: false,
  })
}

export function useInvoiceActions(role: Role, id: string) {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (action: InvoiceAction) => invoiceVeilApi.act(role, id, action),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['invoice', id] }),
        client.invalidateQueries({ queryKey: ['invoices'] }),
        client.invalidateQueries({ queryKey: ['ledgerSnapshot'] }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return {
    run: mutation.mutate,
    busy: mutation.isPending,
    error: mutation.error?.message,
  }
}

export type InvoiceActions = ReturnType<typeof useInvoiceActions>
