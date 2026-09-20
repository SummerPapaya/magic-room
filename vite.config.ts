import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'daxia-v2.html'),
    },
  },
  server: { port: 3001 },
})
