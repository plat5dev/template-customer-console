import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// :3001 is the starter's web port, beside its API on :3000 (the template contract).
export default defineConfig({
  plugins: [react()],
  server: { port: 3001, strictPort: true },
  preview: { port: 3001, strictPort: true },
})
