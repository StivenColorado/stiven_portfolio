import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const api = { '/api': { target: `http://localhost:${process.env.API_PORT ?? 3001}` } }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: api },
  preview: { proxy: api },
  build: {
    rollupOptions: {
      output: { manualChunks: { three: ['three'] } },
    },
  },
})
