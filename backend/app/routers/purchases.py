from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas, auth
from app.services import inventory_service, purchase_parser, cloudinary_service

router = APIRouter(prefix="/api/purchases", tags=["purchases"])

ALLOWED_RECEIPT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_RECEIPT_SIZE_MB = 10


@router.post("", response_model=schemas.PurchaseOut, status_code=status.HTTP_201_CREATED)
def create_purchase(
    purchase_in: schemas.PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not purchase_in.items:
        raise HTTPException(status_code=400, detail="La compra debe tener al menos un alimento")

    total = sum(item.price for item in purchase_in.items)

    purchase = models.Purchase(
        user_id=current_user.id,
        source=purchase_in.source,
        total_amount=total,
        purchase_date=purchase_in.purchase_date or datetime.utcnow(),
        receipt_image_url=purchase_in.receipt_image_url,
    )
    db.add(purchase)
    db.flush()  # para tener purchase.id antes de crear los items

    for item_in in purchase_in.items:
        db.add(
            models.PurchaseItem(
                purchase_id=purchase.id,
                food_name=item_in.food_name,
                quantity=item_in.quantity,
                unit=item_in.unit,
                price=item_in.price,
            )
        )
    db.flush()
    db.refresh(purchase)  # carga los items recién creados

    inventory_service.apply_purchase_to_inventory(db, current_user.id, purchase)

    db.commit()
    db.refresh(purchase)
    return purchase


@router.post("/parse-receipt", response_model=schemas.ParsedReceiptPreview)
async def parse_receipt_purchase(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Recibe una foto o PDF de una factura, extrae los alimentos con Claude
    Vision y devuelve una previsualización (sin guardar la compra todavía)."""
    if file.content_type not in ALLOWED_RECEIPT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Sube una imagen (jpg, png, webp) o un PDF.",
        )

    content = await file.read()
    if len(content) > MAX_RECEIPT_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail=f"El archivo supera el límite de {MAX_RECEIPT_SIZE_MB}MB."
        )
    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    items = purchase_parser.parse_receipt_file(content, file.content_type)
    parsed_items = [schemas.PurchaseItemCreate(**item) for item in items]

    # Se guarda la foto de la factura como respaldo (si Cloudinary está configurado)
    receipt_url = cloudinary_service.upload_file(content, folder="freshly/receipts")

    return schemas.ParsedReceiptPreview(items=parsed_items, receipt_image_url=receipt_url)


@router.post("/parse-voice", response_model=schemas.ParsedPurchasePreview)
def parse_voice_purchase(
    payload: schemas.VoiceTextInput,
    current_user: models.User = Depends(auth.get_current_user),
):
    """Recibe el texto transcrito de un mensaje de voz (ej: 'hoy gasté 3 dólares
    en una cubeta de 30 huevos') y devuelve los alimentos detectados para que
    el usuario los confirme antes de guardarlos como compra."""
    items = purchase_parser.parse_purchase_text(payload.text)
    parsed_items = [schemas.PurchaseItemCreate(**item) for item in items]
    return schemas.ParsedPurchasePreview(items=parsed_items)


@router.post("/transcribe-audio", response_model=schemas.VoiceTextInput)
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Recibe un audio grabado desde el navegador y lo transcribe con Groq Whisper."""
    from app.services.bedrock_service import transcribe_audio as do_transcribe
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío.")
    try:
        text = do_transcribe(content, file.filename or "audio.webm")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al transcribir: {str(e)}")
    if not text or not text.strip():
        raise HTTPException(status_code=422, detail="No se detectó voz en el audio.")
    return schemas.VoiceTextInput(text=text.strip())


@router.get("", response_model=List[schemas.PurchaseOut])
def list_purchases(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Historial de compras, opcionalmente filtrado por rango de fechas."""
    query = (
        db.query(models.Purchase)
        .options(joinedload(models.Purchase.items))
        .filter(models.Purchase.user_id == current_user.id)
    )
    if date_from:
        query = query.filter(models.Purchase.purchase_date >= date_from)
    if date_to:
        query = query.filter(models.Purchase.purchase_date <= date_to)

    return query.order_by(models.Purchase.purchase_date.desc()).all()


@router.get("/{purchase_id}", response_model=schemas.PurchaseOut)
def get_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    purchase = (
        db.query(models.Purchase)
        .options(joinedload(models.Purchase.items))
        .filter(models.Purchase.id == purchase_id, models.Purchase.user_id == current_user.id)
        .first()
    )
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    return purchase


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    purchase = (
        db.query(models.Purchase)
        .options(joinedload(models.Purchase.items))
        .filter(models.Purchase.id == purchase_id, models.Purchase.user_id == current_user.id)
        .first()
    )
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")

    # Revierte lo que esta compra había sumado al inventario antes de borrarla
    inventory_service.revert_purchase_from_inventory(db, current_user.id, purchase)

    db.delete(purchase)
    db.commit()
    return None
