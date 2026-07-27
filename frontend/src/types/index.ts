export interface User {
  id: string; name: string; email: string
  profile_image_url?: string | null; created_at: string
}
export interface Token { access_token: string; token_type: string; user: User }

export interface PurchaseItem {
  id: string; food_name: string; quantity: number; unit: string; price: number
}
export interface PurchaseItemCreate {
  food_name: string; quantity: number; unit: string; price: number
}
export interface Purchase {
  id: string; source: 'manual'|'voice'|'receipt'; total_amount: number
  receipt_image_url?: string|null; purchase_date: string; items: PurchaseItem[]
}
export interface PurchaseCreate {
  source: string; items: PurchaseItemCreate[]
  purchase_date?: string; receipt_image_url?: string|null
}

export type StorageLocation = 'refrigerator'|'freezer'|'pantry'|'cabinet'

export interface InventoryItem {
  id: string; food_name: string; quantity: number; unit: string
  storage_location?: StorageLocation|null
  expiry_days?: number|null
  expires_at?: string|null
  added_at?: string|null
  updated_at: string
  days_remaining?: number|null
  expiry_status?: 'ok'|'warning'|'critical'|'expired'|null
}
export interface InventoryItemCreate {
  food_name: string; quantity: number; unit: string
  storage_location?: string; expiry_days?: number
}
export interface InventoryItemUpdate {
  food_name?: string; quantity?: number; unit?: string
  storage_location?: string; expiry_days?: number
}

export interface SpendingByDate { date: string; total: number }

export interface WeekComparison {
  current_week: number; previous_week: number
  difference: number; percentage: number
}
export interface FoodQuantity { food_name: string; quantity: number; unit: string }
export interface DashboardSummary {
  total_spent: number; purchases_count: number; distinct_foods: number
  top_foods: FoodQuantity[]
  week_comparison?: WeekComparison|null
  expiring_soon: string[]
}

export interface RecipeSuggestion {
  title: string; ingredients: string[]; steps: string[]; missing_ingredients: string[]
}
export interface RecipeSuggestionsOut { recipes: RecipeSuggestion[] }
export interface Recipe {
  id: string; title: string; ingredients: string[]
  steps: string[]; missing_ingredients: string[]; created_at: string
}

export interface ParsedPurchasePreview { items: PurchaseItemCreate[] }
export interface ParsedReceiptPreview { items: PurchaseItemCreate[]; receipt_image_url?: string|null }

export interface NutritionInfo {
  food_name: string
  calories?: string | null
  protein?: string | null
  carbs?: string | null
  fat?: string | null
  fiber?: string | null
  vitamins?: string[] | null
  minerals?: string[] | null
  benefits?: string[] | null
  tips?: string | null
}
