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


# ---------- PURCHASE ITEM ----------
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


# ---------- PURCHASE ----------
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
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryItemCreate(BaseModel):
    food_name: str
    quantity: float
    unit: str = "unidad"


class InventoryItemUpdate(BaseModel):
    food_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None


# ---------- VOICE / TEXT PARSING ----------
class VoiceTextInput(BaseModel):
    text: str  # ej: "hoy gaste 3 dolares en una cubeta de 30 huevos"


class ParsedPurchasePreview(BaseModel):
    items: List[PurchaseItemCreate]


class ParsedReceiptPreview(BaseModel):
    items: List[PurchaseItemCreate]
    receipt_image_url: Optional[str] = None


# ---------- DASHBOARD ----------
class SpendingByDate(BaseModel):
    date: str  # formato YYYY-MM-DD
    total: float


class FoodQuantity(BaseModel):
    food_name: str
    quantity: float
    unit: str


class DashboardSummary(BaseModel):
    total_spent: float
    purchases_count: int
    distinct_foods: int
    top_foods: List[FoodQuantity]


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
