import { useState } from 'react'
import { Card, Btn } from '../components/ui'
import { getTheme, setTheme } from '../utils/theme'
export default function Settings() {
  const [t, set] = useState(getTheme()); const u = JSON.parse(localStorage.getItem('user') || '{}')
  return <div className="max-w-xl space-y-4">
    <Card className="space-y-3"><h2 className="font-semibold">Appearance</h2><div className="flex gap-2" role="radiogroup" aria-label="Theme">{['light', 'dark', 'system'].map(m => <button key={m} role="radio" aria-checked={t === m} onClick={() => { setTheme(m); set(m) }} className={`rounded-lg border px-4 py-2 text-sm capitalize ${t === m ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-soft'}`}>{m}</button>)}</div></Card>
    <Card className="space-y-3"><h2 className="font-semibold">Account</h2><p className="text-sm text-muted">{u.name} · {u.email}</p><Btn variant="ghost" onClick={() => { localStorage.clear(); window.location.href = '/login' }}>Sign out</Btn></Card></div>
}
