from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _week_range(weeks_ago: int = 0):
    today = datetime.utcnow().date()
    start = today - timedelta(days=today.weekday() + weeks_ago * 7)
    end = start + timedelta(days=6)
    return datetime.combine(start, datetime.min.time()), datetime.combine(end, datetime.max.time())


@router.get("/spending", response_model=List[schemas.SpendingByDate])
def spending_by_date(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    group_by: str = "day",  # day | month
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.Purchase).filter(models.Purchase.user_id == current_user.id)
    if date_from:
        query = query.filter(models.Purchase.purchase_date >= date_from)
    if date_to:
        query = query.filter(models.Purchase.purchase_date <= date_to)

    totals = defaultdict(float)
    for purchase in query.all():
        if group_by == "month":
            key = purchase.purchase_date.strftime("%Y-%m")
        elif group_by == "year":
            key = purchase.purchase_date.strftime("%Y")
        else:
            key = purchase.purchase_date.date().isoformat()
        totals[key] += purchase.total_amount

    return [
        schemas.SpendingByDate(date=k, total=round(v, 2))
        for k, v in sorted(totals.items())
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

    # Comparación semanal
    curr_start, curr_end = _week_range(0)
    prev_start, prev_end = _week_range(1)

    curr_week = sum(
        p.total_amount for p in purchases
        if curr_start <= p.purchase_date <= curr_end
    )
    prev_week = sum(
        p.total_amount for p in purchases
        if prev_start <= p.purchase_date <= prev_end
    )
    diff = curr_week - prev_week
    pct = ((diff / prev_week) * 100) if prev_week > 0 else 0

    week_comparison = schemas.WeekComparison(
        current_week=round(curr_week, 2),
        previous_week=round(prev_week, 2),
        difference=round(diff, 2),
        percentage=round(pct, 1),
    )

    # Alimentos próximos a caducar (3 días)
    threshold = datetime.utcnow() + timedelta(days=3)
    expiring = [
        i.food_name for i in inventory
        if i.expires_at and i.expires_at <= threshold and i.expires_at >= datetime.utcnow()
    ]

    return schemas.DashboardSummary(
        total_spent=total_spent,
        purchases_count=len(purchases),
        distinct_foods=len(inventory),
        top_foods=[
            schemas.FoodQuantity(food_name=i.food_name, quantity=i.quantity, unit=i.unit)
            for i in top_foods
        ],
        week_comparison=week_comparison,
        expiring_soon=expiring,
    )
