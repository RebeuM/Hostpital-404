import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './phone.css'
import { useGame, runtime } from './game/store.js'
import * as audio from './game/audio.js'
import * as layout from './game/layout.js'

// Accès de diagnostic (console / tests navigateur) : état du jeu et données temps réel.
window.__game = useGame
window.__runtime = runtime
window.__audio = audio
window.__layout = layout

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
