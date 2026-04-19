import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Env (Vite): `npm run dev` → mode development (.env, .env.development, *.local).
// `npm run build:dev` → same. `npm run build` / `build:prod` → mode production (.env, .env.production, *.local).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
