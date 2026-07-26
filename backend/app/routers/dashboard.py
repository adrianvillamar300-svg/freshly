from collections import defaultdict
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/spending", response_model=List[schemas.SpendingByDate])
def spending_by_date(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Gasto total agrupado por día, para graficar. Se agrega en Python
    (en vez de SQL) para que funcione igual en SQLite (dev) y Postgres (prod)."""
    query = db.query(models.Purchase).filter(models.Purchase.user_id == current_user.id)
    if date_from:
        query = query.filter(models.Purchase.purchase_date >= date_from)
    if date_to:
        query = query.filter(models.Purchase.purchase_date <= date_to)

    totals = defaultdict(float)
    for purchase in query.all():
        day_key = purchase.purchase_date.date().isoformat()
        totals[day_key] += purchase.total_amount

    return [
        schemas.SpendingByDate(date=day, total=round(total, 2))
        for day, total in sorted(totals.items())
    ]


@router.get("/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    purchases = (
        db.query(models.Purchase).filter(models.Purchase.user_id == current_user.id).all()
    )
    inventory = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.user_id == current_user.id)
        .all()
    )

    total_spent = round(sum(p.total_amount for p in purchases), 2)
    top_foods = sorted(inventory, key=lambda i: i.quantity, reverse=True)[:5]

    return schemas.DashboardSummary(
        total_spent=total_spent,
        purchases_count=len(purchases),
        distinct_foods=len(inventory),
        top_foods=[
            schemas.FoodQuantity(food_name=i.food_name, quantity=i.quantity, unit=i.unit)
            for i in top_foods
        ],
    )
