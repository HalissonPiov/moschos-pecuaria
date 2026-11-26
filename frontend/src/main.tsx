import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BackendDataProvider } from '@/shared/demo/backend-data'
import { SessionProvider } from '@/features/auth/session'
import './index.css'
import './styles/acesso.css'
import './styles/rebanho.css'
import './styles/custos.css'
import './styles/vendas.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionProvider>
      <BackendDataProvider>
        <App />
      </BackendDataProvider>
    </SessionProvider>
  </React.StrictMode>,
)
