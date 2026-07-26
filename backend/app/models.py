import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, DateTime, ForeignKey, Enum, Text, Integer, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class PurchaseSource(str, enum.Enum):
    manual = "manual"
    voice = "voice"
    receipt = "receipt"


class StorageLocation(str, enum.Enum):
    refrigerator = "refrigerator"   # Refrigerador
    freezer = "freezer"             # Congelador
    pantry = "pantry"               # Despensa / aire libre
    cabinet = "cabinet"             # Armario


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchases = relationship("Purchase", back_populates="user", cascade="all, delete-orphan")
    inventory_items = relationship("InventoryItem", back_populates="user", cascade="all, delete-orphan")


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    source = Column(Enum(PurchaseSource), default=PurchaseSource.manual)
    total_amount = Column(Float, default=0.0)
    receipt_image_url = Column(String, nullable=True)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    purchase_id = Column(UUID(as_uuid=False), ForeignKey("purchases.id"), nullable=False)
    food_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="unidad")
    price = Column(Float, default=0.0)

    purchase = relationship("Purchase", back_populates="items")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    food_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False, default=0.0)
    unit = Column(String, default="unidad")

    # Nuevos campos para caducidad y almacenamiento
    storage_location = Column(Enum(StorageLocation), default=StorageLocation.pantry, nullable=True)
    expiry_days = Column(Integer, nullable=True)          # días estimados de duración
    expires_at = Column(DateTime, nullable=True)          # fecha calculada de caducidad
    added_at = Column(DateTime, default=datetime.utcnow)  # cuando se agregó al inventario
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notification_sent = Column(Boolean, default=False)    # si ya se envió notificación

    user = relationship("User", back_populates="inventory_items")


class RecipeCache(Base):
    __tablename__ = "recipe_cache"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    ingredients_json = Column(Text, nullable=False)
    steps_json = Column(Text, nullable=False)
    missing_ingredients_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
