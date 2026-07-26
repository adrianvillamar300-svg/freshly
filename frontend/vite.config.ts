import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo: proxy /api/* → backend local
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // En producción el frontend llama a VITE_API_URL directamente
  // (ver src/lib/api.ts)
})
