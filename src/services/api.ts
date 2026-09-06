import type { Customer, Prize } from '../types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')

type Spin = { status: string; spinDate: string; reward: Prize }
type CheckResponse = { exists: boolean; can_spin: boolean; customer?: Customer; spin?: Spin | null }
export type AdminEntry = { customer_name: string; mobile_no: string; address: string; gift: string; created_at: string }

class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message) }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init.headers } })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.success) throw new ApiError(body?.message || 'Unable to connect right now. Please try again.', response.status)
    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('Unable to connect right now. Please try again.')
  }
}

export const api = {
  checkCustomer: async (mobile: string) => request<CheckResponse & { success: true }>('/customer/check', { method: 'POST', body: JSON.stringify({ mobile }) }),
  registerCustomer: async (mobile: string, name: string, address: string) => request<{ customer: Customer; exists: boolean; spin?: Spin | null }>('/customer/register', { method: 'POST', body: JSON.stringify({ mobile, name, address }) }),
  completeSocial: async (mobile: string) => request<{ customer: Customer }>('/customer/social', { method: 'POST', body: JSON.stringify({ mobile, completed: { facebook: true, instagram: true, whatsapp: true } }) }),
  spin: async (mobile: string) => request<{ customer: Customer; spin: Spin; already_spun: boolean }>('/spin', { method: 'POST', body: JSON.stringify({ mobile }) }),
  adminLogin: async (password: string) => request<{ success: true }>('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
  adminSession: async () => request<{ authenticated: boolean }>('/admin/session'),
  getTodayEntries: async () => request<{ count: number; entries: AdminEntry[] }>('/admin/entries'),
  downloadTodayEntries: async () => {
    const response = await fetch(`${BASE_URL}/export/customers`, { method: 'POST', credentials: 'include' })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new ApiError(body?.message || 'Unable to generate the Excel report.', response.status)
    }
    return { blob: await response.blob(), filename: response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'MobileHub_Today_Entries.xlsx' }
  },
}
