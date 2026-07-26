from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services.expiry_service import estimate_expiry_days, get_expiry_status

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _enrich(item: models.InventoryItem) -> schemas.InventoryItemOut:
    """Agrega días restantes y estado de caducidad al item."""
    days_remaining = None
    expiry_status = None

    if item.expires_at:
        delta = item.expires_at - datetime.utcnow()
        days_remaining = delta.days
        expiry_status = get_expiry_status(days_remaining)

    return schemas.InventoryItemOut(
        id=item.id,
        food_name=item.food_name,
        quantity=item.quantity,
        unit=item.unit,
        storage_location=item.storage_location.value if item.storage_location else None,
        expiry_days=item.expiry_days,
        expires_at=item.expires_at,
        added_at=item.added_at,
        updated_at=item.updated_at,
        days_remaining=days_remaining,
        expiry_status=expiry_status,
    )


@router.get("", response_model=List[schemas.InventoryItemOut])
def list_inventory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    items = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.user_id == current_user.id)
        .order_by(models.InventoryItem.food_name)
        .all()
    )
    return [_enrich(i) for i in items]


@router.post("", response_model=schemas.InventoryItemOut, status_code=status.HTTP_201_CREATED)
def add_inventory_item(
    item_in: schemas.InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    location = item_in.storage_location or "pantry"

    # Calcular días de caducidad si no se especificaron
    expiry_days = item_in.expiry_days
    if expiry_days is None:
        expiry_days = estimate_expiry_days(item_in.food_name, location)

    expires_at = datetime.utcnow() + timedelta(days=expiry_days)

    # Map string to enum
    location_enum = models.StorageLocation.pantry
    for loc in models.StorageLocation:
        if loc.value == location:
            location_enum = loc
            break

    item = models.InventoryItem(
        user_id=current_user.id,
        food_name=item_in.food_name.strip(),
        quantity=item_in.quantity,
        unit=item_in.unit,
        storage_location=location_enum,
        expiry_days=expiry_days,
        expires_at=expires_at,
        added_at=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _enrich(item)


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
    if item_in.storage_location is not None:
        for loc in models.StorageLocation:
            if loc.value == item_in.storage_location:
                item.storage_location = loc
                break
        # Recalcular caducidad si cambia el lugar
        expiry_days = item_in.expiry_days or estimate_expiry_days(item.food_name, item_in.storage_location)
        item.expiry_days = expiry_days
        item.expires_at = datetime.utcnow() + timedelta(days=expiry_days)
    if item_in.expiry_days is not None:
        item.expiry_days = item_in.expiry_days
        item.expires_at = datetime.utcnow() + timedelta(days=item_in.expiry_days)

    db.commit()
    db.refresh(item)
    return _enrich(item)


@router.post("/{item_id}/consume", response_model=schemas.InventoryItemOut)
def consume_item(
    item_id: str,
    body: schemas.ConsumeItemRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Reduce la cantidad de un alimento (consumo). Si llega a 0, lo elimina."""
    item = _get_owned_item(db, item_id, current_user.id)
    item.quantity = max(0, item.quantity - body.amount)

    if item.quantity == 0:
        db.delete(item)
        db.commit()
        # Return a dummy enriched object to signal deletion
        return schemas.InventoryItemOut(
            id=item_id, food_name=item.food_name,
            quantity=0, unit=item.unit, updated_at=datetime.utcnow()
        )

    db.commit()
    db.refresh(item)
    return _enrich(item)


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


@router.get("/expiring", response_model=List[schemas.InventoryItemOut])
def expiring_items(
    days: int = 3,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Alimentos que caducan en los próximos N días."""
    threshold = datetime.utcnow() + timedelta(days=days)
    items = (
        db.query(models.InventoryItem)
        .filter(
            models.InventoryItem.user_id == current_user.id,
            models.InventoryItem.expires_at <= threshold,
            models.InventoryItem.expires_at >= datetime.utcnow(),
        )
        .all()
    )
    return [_enrich(i) for i in items]
