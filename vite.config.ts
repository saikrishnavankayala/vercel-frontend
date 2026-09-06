import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Local development uses the same browser origin for the React app and API.
  // Vite forwards these calls to Flask, avoiding localhost/127.0.0.1 CORS issues.
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
})
