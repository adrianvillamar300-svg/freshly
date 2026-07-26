# 🚀 Guía de despliegue en Railway

## Arquitectura en producción

```
Railway Project
├── freshly-backend    (FastAPI via Docker)
├── freshly-frontend   (React estático via Nixpacks)
└── PostgreSQL         (Plugin de Railway)
```

---

## PARTE 1 — Preparar el repositorio

Railway despliega desde GitHub. Necesitas subir el proyecto.

### 1.1 Crear repositorio en GitHub

```bash
# Desde la raíz del proyecto (carpeta freshly/)
git init
git add .
git commit -m "feat: freshly inicial"
```

Ve a github.com → New repository → crea uno vacío llamado `freshly`.

```bash
git remote add origin https://github.com/TU_USUARIO/freshly.git
git branch -M main
git push -u origin main
```

---

## PARTE 2 — Desplegar el Backend

### 2.1 Crear proyecto en Railway

1. Ve a **railway.app** → Login con GitHub
2. Click **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Elige tu repositorio `freshly`
5. Railway detectará el proyecto — click **"Add service"** → **"GitHub Repo"**
6. En la configuración del servicio, cambia el **Root Directory** a `backend`

Railway usará el `Dockerfile` del backend automáticamente.

### 2.2 Agregar PostgreSQL

1. En tu proyecto Railway → **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway crea la base de datos y genera la variable `DATABASE_URL` automáticamente

### 2.3 Configurar variables de entorno del backend

En el servicio backend → pestaña **"Variables"** → agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Se llena automáticamente desde el plugin de Postgres ✅ |
| `JWT_SECRET` | Genera uno fuerte: `openssl rand -hex 32` |
| `CLOUDINARY_CLOUD_NAME` | Desde cloudinary.com (plan gratis) |
| `CLOUDINARY_API_KEY` | Desde cloudinary.com |
| `CLOUDINARY_API_SECRET` | Desde cloudinary.com |
| `AWS_ACCESS_KEY_ID` | Desde AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | Desde AWS IAM |
| `AWS_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `FRONTEND_URL` | La URL del frontend (la obtienes después de desplegarlo) |

> 💡 Para conectar el `DATABASE_URL` del plugin de Postgres:
> En el servicio backend → Variables → **"Add Reference"** → selecciona
> `DATABASE_URL` de la base de datos PostgreSQL.

### 2.4 Verificar el backend

Una vez desplegado, Railway te da una URL como:
`https://freshly-backend-production.up.railway.app`

Abre en el navegador:
- `https://tu-backend.up.railway.app/` → debe responder `{"status":"ok"}`
- `https://tu-backend.up.railway.app/docs` → Swagger UI completo

---

## PARTE 3 — Desplegar el Frontend

### 3.1 Agregar servicio frontend

1. En tu proyecto Railway → **"New"** → **"GitHub Repo"** (mismo repo)
2. Cambia el **Root Directory** a `frontend`
3. Railway usará `nixpacks.toml` para hacer el build

### 3.2 Configurar variables del frontend

En el servicio frontend → **"Variables"**:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://tu-backend.up.railway.app` (sin `/` al final) |

> ⚠️ Este valor debe ser la URL pública del servicio backend que obtuviste en el paso 2.4.

### 3.3 Actualizar CORS en el backend

Una vez que Railway te dé la URL del frontend (ej: `https://freshly-frontend.up.railway.app`):

1. Ve al servicio **backend** → Variables
2. Actualiza `FRONTEND_URL` con la URL del frontend

El backend acepta múltiples URLs separadas por coma si las necesitas:
```
FRONTEND_URL=https://freshly-frontend.up.railway.app,https://tudominio.com
```

3. Railway redespliega el backend automáticamente.

---

## PARTE 4 — Verificar todo

### Checklist final

- [ ] `https://tu-backend.up.railway.app/` responde `{"status":"ok"}`
- [ ] `https://tu-backend.up.railway.app/api/health` responde `{"status":"healthy"}`
- [ ] `https://tu-frontend.up.railway.app` carga la pantalla de login
- [ ] Puedes registrar un usuario nuevo
- [ ] Puedes iniciar sesión
- [ ] El dashboard carga sin errores
- [ ] Puedes agregar alimentos al inventario
- [ ] La sección de recetas genera sugerencias (requiere Bedrock configurado)

---

## Servicios externos necesarios

### Cloudinary (gratis)
1. Ve a **cloudinary.com** → Sign up gratis
2. En el Dashboard copia: Cloud Name, API Key, API Secret
3. Pégalos en las variables del backend en Railway

### AWS Bedrock (requiere cuenta AWS)
1. Ve a **aws.amazon.com** → IAM → Crear usuario con política `AmazonBedrockFullAccess`
2. Genera Access Key + Secret Key
3. En AWS Bedrock → Model access → habilita `Claude 3.5 Sonnet`
4. Pégalos en las variables del backend

---

## Dominio personalizado (opcional)

En Railway → servicio frontend → **"Settings"** → **"Custom Domain"**:
1. Agrega tu dominio (ej: `freshly.tudominio.com`)
2. Railway te da un CNAME para configurar en tu DNS
3. Actualiza `FRONTEND_URL` en el backend con el nuevo dominio

---

## Comandos útiles para desarrollo local

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # llena las variables
uvicorn app.main:app --reload --port 8000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev            # → http://localhost:5173
```
