import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './index.css'

import ErrorBoundary from './components/ErrorBoundary'

import Shell from './layouts/Shell'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import Documents from './pages/Documents'
import Tutor from './pages/Tutor'
import Quiz from './pages/Quiz'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import Settings from './pages/Settings'
import { initTheme } from './utils/theme'
initTheme()
const Guard = () => localStorage.getItem('token') ? <Outlet /> : <Navigate to="/login" replace />
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Guard />}>
          <Route element={<Shell />}>
            <Route
              index
              element={<Navigate to="/dashboard" replace />}
            />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/subjects/:id" element={<Subjects />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/ai-tutor" element={<Tutor />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
)