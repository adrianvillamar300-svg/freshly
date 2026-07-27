import axios from 'axios'
import type {
  Token, User,
  Purchase, PurchaseCreate,
  InventoryItem, InventoryItemCreate, InventoryItemUpdate,
  SpendingByDate, DashboardSummary,
  RecipeSuggestionsOut, Recipe,
  ParsedPurchasePreview, ParsedReceiptPreview,
  NutritionInfo,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('freshly_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('freshly_token'); window.location.href = '/login' }
  return Promise.reject(err)
})

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<Token>('/auth/register', data).then(r => r.data),
  login: (email: string, password: string) =>
    api.post<Token>('/auth/login', { email, password }).then(r => r.data),
  me: () => api.get<User>('/auth/me').then(r => r.data),
}

export const usersApi = {
  updateMe: (data: { name?: string }) => api.put<User>('/users/me', data).then(r => r.data),
  uploadPhoto: (file: File) => {
    const form = new FormData(); form.append('file', file)
    return api.post<User>('/users/me/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
}

export const purchasesApi = {
  list: (params?: { from?: string; to?: string }) =>
    api.get<Purchase[]>('/purchases', { params }).then(r => r.data),
  get: (id: string) => api.get<Purchase>(`/purchases/${id}`).then(r => r.data),
  create: (data: PurchaseCreate) => api.post<Purchase>('/purchases', data).then(r => r.data),
  delete: (id: string) => api.delete(`/purchases/${id}`).then(r => r.data),
  parseVoice: (text: string) =>
    api.post<ParsedPurchasePreview>('/purchases/parse-voice', { text }).then(r => r.data),
  parseReceipt: (file: File) => {
    const form = new FormData(); form.append('file', file)
    return api.post<ParsedReceiptPreview>('/purchases/parse-receipt', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}

export const inventoryApi = {
  list: () => api.get<InventoryItem[]>('/inventory').then(r => r.data),
  create: (data: InventoryItemCreate) => api.post<InventoryItem>('/inventory', data).then(r => r.data),
  update: (id: string, data: InventoryItemUpdate) => api.put<InventoryItem>(`/inventory/${id}`, data).then(r => r.data),
  consume: (id: string, amount: number = 1) =>
    api.post<InventoryItem>(`/inventory/${id}/consume`, { amount }).then(r => r.data),
  delete: (id: string) => api.delete(`/inventory/${id}`).then(r => r.data),
  expiring: (days?: number) => api.get<InventoryItem[]>('/inventory/expiring', { params: { days } }).then(r => r.data),
  nutrition: (foodName: string) =>
    api.get<NutritionInfo>(`/inventory/nutrition/${encodeURIComponent(foodName)}`).then(r => r.data),
  dailyQuiz: () =>
    api.get<{ questions: Array<{ question: string; options: string[]; correct: number; explanation: string }> }>('/inventory/quiz/daily').then(r => r.data),
  analyzePhoto: (file: File) => {
    const form = new FormData(); form.append('file', file)
    return api.post<{ items: Array<{ food_name: string; quantity: number; unit: string }> }>(
      '/inventory/analyze-photo', form, { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data)
  },
}

export const dashboardApi = {
  spending: (params?: { date_from?: string; date_to?: string; group_by?: string }) =>
    api.get<SpendingByDate[]>('/dashboard/spending', { params }).then(r => r.data),
  summary: () => api.get<DashboardSummary>('/dashboard/summary').then(r => r.data),
}

export const recipesApi = {
  suggestions: () => api.get<RecipeSuggestionsOut>('/recipes/suggestions').then(r => r.data),
  save: (recipe: Omit<Recipe, 'id'|'created_at'>) => api.post<Recipe>('/recipes/save', recipe).then(r => r.data),
  history: () => api.get<Recipe[]>('/recipes/history').then(r => r.data),
  get: (id: string) => api.get<Recipe>(`/recipes/${id}`).then(r => r.data),
  delete: (id: string) => api.delete(`/recipes/${id}`).then(r => r.data),
}

export default api
