import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import router from './router/index.jsx'

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="bottom-center" richColors duration={5000} />
  </StrictMode>
)
