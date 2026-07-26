from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models


def _find_inventory_item(db: Session, user_id: str, food_name: str, unit: str):
    """Busca un item de inventario existente, comparando el nombre sin
    importar mayúsculas/espacios, y que use la misma unidad."""
    return (
        db.query(models.InventoryItem)
        .filter(
            models.InventoryItem.user_id == user_id,
            func.lower(models.InventoryItem.food_name) == food_name.strip().lower(),
            models.InventoryItem.unit == unit,
        )
        .first()
    )


def add_to_inventory(db: Session, user_id: str, food_name: str, quantity: float, unit: str):
    """Suma cantidad al inventario. Si no existe el alimento (con esa unidad), lo crea."""
    item = _find_inventory_item(db, user_id, food_name, unit)
    if item:
        item.quantity += quantity
    else:
        item = models.InventoryItem(
            user_id=user_id,
            food_name=food_name.strip(),
            quantity=quantity,
            unit=unit,
        )
        db.add(item)
    db.flush()
    return item


def remove_from_inventory(db: Session, user_id: str, food_name: str, quantity: float, unit: str):
    """Resta cantidad del inventario (ej: al borrar una compra). No baja de 0."""
    item = _find_inventory_item(db, user_id, food_name, unit)
    if item:
        item.quantity = max(0.0, item.quantity - quantity)
        db.flush()
    return item


def apply_purchase_to_inventory(db: Session, user_id: str, purchase: models.Purchase):
    for purchase_item in purchase.items:
        add_to_inventory(
            db, user_id, purchase_item.food_name, purchase_item.quantity, purchase_item.unit
        )


def revert_purchase_from_inventory(db: Session, user_id: str, purchase: models.Purchase):
    for purchase_item in purchase.items:
        remove_from_inventory(
            db, user_id, purchase_item.food_name, purchase_item.quantity, purchase_item.unit
        )
