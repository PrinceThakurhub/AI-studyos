import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, GraduationCap, PanelLeft, Search } from 'lucide-react'
import { Toasts } from '../components/ui'
import CommandPalette from '../components/CommandPalette'
import { nav } from '../utils/nav'
export default function () {
  const user = JSON.parse(localStorage.getItem('user') || '{}'); const loc = useLocation()
  const [open, setOpen] = useState(false); const [pal, setPal] = useState(false); const [mini, setMini] = useState(localStorage.getItem('mini') === '1')
  const logout = () => { localStorage.clear(); window.location.href = '/login' }
  const toggleMini = () => { localStorage.setItem('mini', mini ? '0' : '1'); setMini(!mini) }
  useEffect(() => { const h = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal(p => !p) } }; addEventListener('keydown', h); return () => removeEventListener('keydown', h) }, [])
  const title = nav.find(n => loc.pathname.startsWith(n[0]))?.[1] || 'StudyOS'
  return <div className="min-h-screen lg:flex">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-card p-3 transition-all lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mini ? 'lg:w-16' : ''} ${open ? '' : '-translate-x-full'}`}>
      <div className="mb-6 flex items-center gap-2 px-2 text-lg font-bold text-primary"><GraduationCap className="shrink-0" /><span className={mini ? 'lg:hidden' : ''}>StudyOS</span></div>
      <nav className="flex-1 space-y-1">{nav.map(([to, l, I]) => <NavLink key={to} to={to} title={l} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted hover:bg-soft'}`}><I size={18} className="shrink-0" /><span className={mini ? 'lg:hidden' : ''}>{l}</span></NavLink>)}</nav>
      <button onClick={toggleMini} aria-label="Collapse sidebar" className="hidden items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-soft lg:flex"><PanelLeft size={18} /><span className={mini ? 'lg:hidden' : ''}>Collapse</span></button>
    </aside>
    {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card px-4 py-3 lg:px-8">
        <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button>
        <h1 className="font-semibold">{title}</h1>
        <button onClick={() => setPal(true)} className="mx-auto flex w-full max-w-sm items-center gap-2 rounded-lg border bg-soft px-3 py-1.5 text-sm text-muted"><Search size={14} /><span className="flex-1 truncate text-left">Search subjects, notes, questions...</span><kbd className="hidden text-xs sm:block">Ctrl K</kbd></button>
        {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-white">{(user.name || 'S')[0]}</div>}
        <button aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={18} /></button>
      </header>
      <main className="mx-auto max-w-6xl p-4 lg:p-8"><Outlet /></main>
    </div><Toasts /><CommandPalette open={pal} onClose={() => setPal(false)} /></div>
}
