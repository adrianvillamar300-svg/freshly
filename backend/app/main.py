from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import settings
from app.routers import auth, purchases, inventory, users, dashboard, recipes

# Crea las tablas si no existen (para producción real se recomienda usar Alembic,
# pero para el MVP esto es suficiente y simple).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Freshly API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(purchases.router)
app.include_router(inventory.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(recipes.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Freshly API"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
