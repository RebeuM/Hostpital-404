import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, /api répond avec une base locale en mémoire (voir scripts/dev-leaderboard.mjs).
function devLeaderboard() {
  const mount = async server => {
    const { leaderboardMiddleware } = await import('./scripts/dev-leaderboard.mjs')
    server.middlewares.use(leaderboardMiddleware())
  }
  return { name: 'dev-leaderboard', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), devLeaderboard()],
  server: { host: true, port: 5173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1400 }
})
