from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import cloudinary_service

router = APIRouter(prefix="/api/users", tags=["users"])

ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_SIZE_MB = 5


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
        current_user.name = name

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/photo", response_model=schemas.UserOut)
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(
            status_code=400, detail="Formato no soportado. Sube una imagen jpg, png o webp."
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(content) > MAX_PHOTO_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail=f"El archivo supera el límite de {MAX_PHOTO_SIZE_MB}MB."
        )

    url = cloudinary_service.upload_file(content, folder="freshly/profiles")
    if not url:
        raise HTTPException(
            status_code=503,
            detail="El almacenamiento de imágenes no está configurado en el servidor.",
        )

    current_user.profile_image_url = url
    db.commit()
    db.refresh(current_user)
    return current_user
