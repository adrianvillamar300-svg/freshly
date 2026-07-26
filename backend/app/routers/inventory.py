from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("", response_model=List[schemas.InventoryItemOut])
def list_inventory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.user_id == current_user.id)
        .order_by(models.InventoryItem.food_name)
        .all()
    )


@router.post("", response_model=schemas.InventoryItemOut, status_code=status.HTTP_201_CREATED)
def add_inventory_item(
    item_in: schemas.InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Agrega un alimento directamente al inventario, sin pasar por una compra
    (útil para correcciones o alimentos que ya tenías antes de usar la app)."""
    item = models.InventoryItem(
        user_id=current_user.id,
        food_name=item_in.food_name.strip(),
        quantity=item_in.quantity,
        unit=item_in.unit,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _get_owned_item(db: Session, item_id: str, user_id: str) -> models.InventoryItem:
    item = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.id == item_id, models.InventoryItem.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Alimento no encontrado en el inventario")
    return item


@router.put("/{item_id}", response_model=schemas.InventoryItemOut)
def update_inventory_item(
    item_id: str,
    item_in: schemas.InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    item = _get_owned_item(db, item_id, current_user.id)

    if item_in.food_name is not None:
        item.food_name = item_in.food_name.strip()
    if item_in.quantity is not None:
        if item_in.quantity < 0:
            raise HTTPException(status_code=400, detail="La cantidad no puede ser negativa")
        item.quantity = item_in.quantity
    if item_in.unit is not None:
        item.unit = item_in.unit

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    item = _get_owned_item(db, item_id, current_user.id)
    db.delete(item)
    db.commit()
    return None
