import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

if (import.meta.env.DEV) {
  void import('./lib/planning.selftest')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
