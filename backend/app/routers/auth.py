from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese correo")

    user = models.User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=auth.hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": user.id})
    return schemas.Token(access_token=token, user=user)


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    token = auth.create_access_token({"sub": user.id})
    return schemas.Token(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
