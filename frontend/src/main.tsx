import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import { initOfflineRuntime } from './services/offlineRuntime'

function loadRuntimeConfig() {
  const script = document.createElement('script')
  script.src = '/api/config.js'
  script.async = true
  script.onerror = () => {
    console.warn('Runtime config unavailable')
  }
  document.head.appendChild(script)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DarkModeProvider>
      <NotificationProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </NotificationProvider>
    </DarkModeProvider>
  </React.StrictMode>,
)

initOfflineRuntime()
loadRuntimeConfig()
