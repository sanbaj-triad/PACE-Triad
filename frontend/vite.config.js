import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Define all our proxy routes programmatically pointing to HTTPS backend with secure=false (self-signed cert bypass)
const routes = [
  '/analytics', '/users', '/customers', '/projects', '/invoices',
  '/leads', '/milestones', '/line-items', '/xero', '/static',
  '/token', '/reports', '/attachments', '/locations', '/tasks',
  '/task-notes', '/calendar', '/expenses', '/emails', '/system', '/ai',
  '/notifications', '/task-events', '/pto', '/auth',
]

const proxyConfig = {}
routes.forEach(r => {
  proxyConfig[r] = {
    target: 'http://127.0.0.1:8000',
    secure: false, // Bypass self-signed cert validation between node and python
  }
})

// Enable dedicated WebSocket Proxy mapping locally
proxyConfig['/ws'] = {
  target: 'http://127.0.0.1:8000',
  ws: true,
  secure: false
}

// Safely configure HTTPS for local development, gracefully falling back if certificates aren't mounted (e.g. during Docker Build phase)
const keyPath = path.resolve(__dirname, '../ssl_certs/nginx.key');
const certPath = path.resolve(__dirname, '../ssl_certs/nginx.crt');

const httpsConfig = (fs.existsSync(keyPath) && fs.existsSync(certPath))
  ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  : false; // False prevents throwing a fatal filesystem error in Docker headless build context

export default defineConfig({
  plugins: [react()],
  server: {
    https: false,
    proxy: proxyConfig
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: ['gantt-task-react']
  }
})
