import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Émet version.json à chaque build — sondé par le frontend pour détecter
// une nouvelle version déployée et déclencher le rechargement automatique.
const versionFilePlugin = () => ({
  name: 'version-file',
  apply: 'build' as const,
  closeBundle() {
    fs.writeFileSync(
      path.resolve(__dirname, 'dist/version.json'),
      JSON.stringify({ version: Date.now().toString(36) })
    )
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    versionFilePlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    allowedHosts: [
      "unscreened-monroe-entomogenous.ngrok-free.dev"
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
