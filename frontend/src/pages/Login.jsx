import { useEffect, useRef, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { googleLogin } from '../services/api'
import { Card } from '../components/ui'
const CID = import.meta.env.VITE_GOOGLE_CLIENT_ID
export default function Login() {
  const btn = useRef(); const nav = useNavigate(); const [err, setErr] = useState('')
  const ok = CID && !CID.startsWith('your_')
  useEffect(() => {
    if (!ok) return
    const init = () => {
      window.google.accounts.id.initialize({ client_id: CID, callback: async ({ credential }) => {
        try { const r = await googleLogin(credential); localStorage.setItem('token', r.token); localStorage.setItem('user', JSON.stringify(r.user)); nav('/dashboard', { replace: true }) }
        catch (e) { setErr(e.message) } } })
      window.google.accounts.id.renderButton(btn.current, { theme: 'outline', size: 'large', width: 300, text: 'continue_with' })
    }
    if (window.google?.accounts) return init()
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init; s.onerror = () => setErr('Could not load Google sign-in. Check your internet connection.')
    document.head.appendChild(s)
  }, [])
  if (localStorage.getItem('token')) return <Navigate to="/dashboard" replace />
  return <div className="flex min-h-screen items-center justify-center p-4"><Card className="w-full max-w-sm space-y-5 text-center !p-8">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white"><GraduationCap /></div>
    <div><h1 className="text-xl font-bold">AI StudyOS</h1><p className="text-sm text-muted">Your AI-powered study command center</p></div>
    {ok ? <div className="flex justify-center" ref={btn} /> : <p className="rounded-lg bg-amber-500/10 p-3 text-left text-sm text-amber-800">Google login is not configured. Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> and restart <code>npm run dev</code>.</p>}
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}</Card></div>
}
