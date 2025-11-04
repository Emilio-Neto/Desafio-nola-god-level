// frontend/src/main.tsx (VERSÃO CORRIGIDA)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'  // <-- ALTERADO para.jsx

// A linha 'index.css' foi removida.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)