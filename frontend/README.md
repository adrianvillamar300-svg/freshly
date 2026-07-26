# Freshly — Frontend

Interfaz web moderna construida con React + TypeScript.

## Stack

- **React 18** + **TypeScript**
- **Vite** (bundler)
- **React Router v6** (navegación)
- **Recharts** (gráficas)
- **date-fns** (fechas en español)
- **lucide-react** (íconos)
- **axios** (HTTP)

## Design System

| Token | Valor |
|---|---|
| Background | `#0B0F0E` |
| Surface | `#141B18` |
| Primary | `#3ED598` |
| Warning | `#F5B841` |
| Danger | `#FF6B6B` |
| Text | `#F4F7F5` |

Tipografías: **Space Grotesk**, **Inter**, **IBM Plex Mono**

## Cómo correrlo

```bash
cd frontend
npm install
npm run dev
```

El frontend corre en `http://localhost:5173` y hace proxy de las peticiones `/api/*`
hacia el backend en `http://localhost:8000` (configurado en `vite.config.ts`).

## Estructura

```
src/
├── components/
│   ├── layout/       # AppLayout, Sidebar, Navbar, FloatingDock
│   └── ui/           # Button, Card, Input, Modal, Toast, Badge, Skeleton...
├── contexts/         # AuthContext
├── lib/              # api.ts (axios instance + endpoints)
├── pages/            # Una página por ruta
└── types/            # TypeScript types + SpeechRecognition declarations
```

## Características

- 🎨 Dark mode premium (inspirado en Linear, Vercel, Stripe)
- 📱 100% Mobile First / Responsive
- 🔐 Auth con JWT (login, registro, /me)
- 📊 Dashboard con gráficas de gasto
- 📦 Inventario con CRUD inline
- 🛒 Compras: manual, voz (Web Speech API) y foto de factura
- 🍽️ Recetas sugeridas por IA
- 👤 Perfil con foto (Cloudinary)
- ⚙️ Configuración
- 🔮 Dock flotante para agregar alimentos
- 💀 Skeleton loading en todas las vistas
- 📭 Empty states descriptivos
- 🍞 Toast notifications
