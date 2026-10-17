import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'
import './index.css'
import App from './App.jsx'

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {reduceMotion ? (
      <App />
    ) : (
      <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
        <App />
      </ReactLenis>
    )}
  </StrictMode>,
)