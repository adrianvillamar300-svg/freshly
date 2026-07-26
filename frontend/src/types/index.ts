// User types
export interface User {
  id: string
  name: string
  email: string
  profile_image_url?: string | null
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
  user: User
}

// Purchase types
export interface PurchaseItem {
  id: string
  food_name: string
  quantity: number
  unit: string
  price: number
}

export interface PurchaseItemCreate {
  food_name: string
  quantity: number
  unit: string
  price: number
}

export interface Purchase {
  id: string
  source: 'manual' | 'voice' | 'receipt'
  total_amount: number
  receipt_image_url?: string | null
  purchase_date: string
  items: PurchaseItem[]
}

export interface PurchaseCreate {
  source: string
  items: PurchaseItemCreate[]
  purchase_date?: string
  receipt_image_url?: string | null
}

// Inventory types
export interface InventoryItem {
  id: string
  food_name: string
  quantity: number
  unit: string
  updated_at: string
}

export interface InventoryItemCreate {
  food_name: string
  quantity: number
  unit: string
}

export interface InventoryItemUpdate {
  food_name?: string
  quantity?: number
  unit?: string
}

// Dashboard types
export interface SpendingByDate {
  date: string
  total: number
}

export interface FoodQuantity {
  food_name: string
  quantity: number
  unit: string
}

export interface DashboardSummary {
  total_spent: number
  purchases_count: number
  distinct_foods: number
  top_foods: FoodQuantity[]
}

// Recipe types
export interface RecipeSuggestion {
  title: string
  ingredients: string[]
  steps: string[]
  missing_ingredients: string[]
}

export interface RecipeSuggestionsOut {
  recipes: RecipeSuggestion[]
}

export interface Recipe {
  id: string
  title: string
  ingredients: string[]
  steps: string[]
  missing_ingredients: string[]
  created_at: string
}

// API response for parsing
export interface ParsedPurchasePreview {
  items: PurchaseItemCreate[]
}

export interface ParsedReceiptPreview {
  items: PurchaseItemCreate[]
  receipt_image_url?: string | null
}
