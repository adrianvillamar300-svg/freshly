# Freshly 🥑

App de inventario de alimentos con IA. Registra tus compras manualmente, por voz o subiendo la foto de la factura, y Freshly te muestra tu inventario, historial y te recomienda recetas con lo que tienes.

## Estructura del proyecto

```
freshly/
├── backend/     → API en FastAPI (Python)
└── frontend/    → App web en React (próximo paso)
```

## Backend - cómo correrlo localmente

```bash
cd backend
python -m venv venv
source venv/bin/activate  # en Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edita .env con tu DATABASE_URL local o de Railway
uvicorn app.main:app --reload
```

Luego abre http://localhost:8000/docs para ver la documentación interactiva (Swagger) y probar los endpoints.

## Progreso

- [x] Estructura base del backend (FastAPI + SQLAlchemy + Postgres)
- [x] Modelos: User, Purchase, PurchaseItem, InventoryItem, RecipeCache
- [x] Autenticación con JWT (registro, login, /me)
- [x] CRUD de inventario manual + historial de compras (auto-actualiza inventario)
- [x] Entrada por voz (texto → IA vía Amazon Bedrock → estructurado)
- [x] Entrada por foto/PDF de factura (Claude Vision vía Amazon Bedrock)
- [x] Foto de perfil (Cloudinary)
- [x] Dashboard con gráficas (gasto por fecha, resumen)
- [x] Recomendación de recetas con IA (sugerencias, guardar, historial)
- [ ] Frontend (React + Tailwind, modo oscuro/claro)
- [ ] Deploy en Railway

## Backend: endpoints completos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Usuario actual |
| PUT | `/api/users/me` | Editar nombre |
| POST | `/api/users/me/photo` | Subir foto de perfil |
| POST | `/api/purchases` | Registrar compra (manual/voz/factura confirmada) |
| GET | `/api/purchases` | Historial de compras (filtrable por fecha) |
| GET | `/api/purchases/{id}` | Ver una compra |
| DELETE | `/api/purchases/{id}` | Eliminar compra (revierte inventario) |
| POST | `/api/purchases/parse-voice` | Texto de voz → preview de items |
| POST | `/api/purchases/parse-receipt` | Foto/PDF de factura → preview de items |
| GET | `/api/inventory` | Ver inventario actual |
| POST | `/api/inventory` | Agregar alimento manualmente |
| PUT | `/api/inventory/{id}` | Editar alimento |
| DELETE | `/api/inventory/{id}` | Eliminar alimento |
| GET | `/api/dashboard/spending` | Gasto agrupado por fecha (para gráficas) |
| GET | `/api/dashboard/summary` | Resumen: total gastado, compras, top alimentos |
| GET | `/api/recipes/suggestions` | Sugerencias de recetas con IA según inventario |
| POST | `/api/recipes/save` | Guardar una receta sugerida |
| GET | `/api/recipes/history` | Historial de recetas guardadas |
| GET | `/api/recipes/{id}` | Ver una receta guardada |
| DELETE | `/api/recipes/{id}` | Eliminar receta guardada |

## Siguiente paso

Paso 6: frontend en React + Tailwind (auth, dashboard, agregar alimentos por
las 3 vías, historial, recetas, modo oscuro/claro, logo).

## Notas sobre el endpoint de facturas

`POST /api/purchases/parse-receipt` recibe un `multipart/form-data` con el campo
`file` (imagen jpg/png/webp o PDF, máx. 10MB). Devuelve los alimentos detectados
más una URL de la foto (si Cloudinary está configurado; si no, devuelve `null` sin
fallar). Igual que con voz, esto es solo una **previsualización** — el frontend debe
mostrarle los items al usuario para que confirme/corrija antes de llamar a
`POST /api/purchases` con `source: "receipt"` y el `receipt_image_url` recibido.

Para que la subida de fotos funcione en producción, crea una cuenta gratis en
[cloudinary.com](https://cloudinary.com) y llena `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` en las variables de entorno de Railway.

## Notas sobre el endpoint de voz

`POST /api/purchases/parse-voice` recibe `{"text": "..."}` (el texto ya transcrito por
el navegador con la Web Speech API, por ejemplo) y devuelve los alimentos detectados
**sin guardarlos todavía**. La idea es que el frontend le muestre esto al usuario para
que confirme o corrija antes de guardar. Una vez confirmado, el frontend llama a
`POST /api/purchases` normal con `source: "voice"` y esos items (editados o no).

Esto no se pudo probar contra Amazon Bedrock real en este entorno (sin acceso a AWS),
pero toda la lógica de prompt, parseo de JSON y manejo de errores (incluyendo cuando
la IA envuelve el JSON en backticks de markdown) está probada con respuestas simuladas.
Pruébalo con tus credenciales reales de AWS antes de desplegar.
