import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: { allowedHosts: ['ivgleb.ru', 'www.ivgleb.ru'] },
})
