from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ---------- USER ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    profile_image_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- PURCHASE ----------
class PurchaseItemCreate(BaseModel):
    food_name: str
    quantity: float
    unit: str = "unidad"
    price: float = 0.0

class PurchaseItemOut(BaseModel):
    id: str
    food_name: str
    quantity: float
    unit: str
    price: float
    class Config:
        from_attributes = True

class PurchaseCreate(BaseModel):
    source: str = "manual"
    items: List[PurchaseItemCreate]
    purchase_date: Optional[datetime] = None
    receipt_image_url: Optional[str] = None

class PurchaseOut(BaseModel):
    id: str
    source: str
    total_amount: float
    receipt_image_url: Optional[str] = None
    purchase_date: datetime
    items: List[PurchaseItemOut]
    class Config:
        from_attributes = True


# ---------- INVENTORY ----------
class InventoryItemOut(BaseModel):
    id: str
    food_name: str
    quantity: float
    unit: str
    storage_location: Optional[str] = None
    expiry_days: Optional[int] = None
    expires_at: Optional[datetime] = None
    added_at: Optional[datetime] = None
    updated_at: datetime
    days_remaining: Optional[int] = None   # calculado en runtime
    expiry_status: Optional[str] = None    # 'ok' | 'warning' | 'expired'
    class Config:
        from_attributes = True

class InventoryItemCreate(BaseModel):
    food_name: str
    quantity: float
    unit: str = "unidad"
    storage_location: Optional[str] = "pantry"
    expiry_days: Optional[int] = None

class InventoryItemUpdate(BaseModel):
    food_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    storage_location: Optional[str] = None
    expiry_days: Optional[int] = None

class ConsumeItemRequest(BaseModel):
    amount: float = 1.0


# ---------- VOICE / TEXT PARSING ----------
class VoiceTextInput(BaseModel):
    text: str

class ParsedPurchasePreview(BaseModel):
    items: List[PurchaseItemCreate]

class ParsedReceiptPreview(BaseModel):
    items: List[PurchaseItemCreate]
    receipt_image_url: Optional[str] = None


# ---------- DASHBOARD ----------
class SpendingByDate(BaseModel):
    date: str
    total: float

class SpendingByMonth(BaseModel):
    month: str  # YYYY-MM
    total: float

class FoodQuantity(BaseModel):
    food_name: str
    quantity: float
    unit: str

class WeekComparison(BaseModel):
    current_week: float
    previous_week: float
    difference: float
    percentage: float

class DashboardSummary(BaseModel):
    total_spent: float
    purchases_count: int
    distinct_foods: int
    top_foods: List[FoodQuantity]
    week_comparison: Optional[WeekComparison] = None
    expiring_soon: List[str] = []   # nombres de alimentos próximos a caducar


# ---------- RECIPE ----------
class RecipeSuggestion(BaseModel):
    title: str
    ingredients: List[str]
    steps: List[str]
    missing_ingredients: List[str] = []

class RecipeSuggestionsOut(BaseModel):
    recipes: List[RecipeSuggestion]

class RecipeOut(BaseModel):
    id: str
    title: str
    ingredients: List[str]
    steps: List[str]
    missing_ingredients: List[str] = []
    created_at: datetime
    class Config:
        from_attributes = True
