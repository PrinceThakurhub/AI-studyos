import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, Inbox } from 'lucide-react'
export const toast = (msg, type = 'ok') => window.dispatchEvent(new CustomEvent('toast', { detail: { msg, type } }))
export function Toasts() {
  const [t, set] = useState([])
  useEffect(() => { const h = e => { const id = Math.random(); set(x => [...x, { id, ...e.detail }]); setTimeout(() => set(x => x.filter(i => i.id !== id)), 3500) }; window.addEventListener('toast', h); return () => window.removeEventListener('toast', h) }, [])
  return <div className="fixed bottom-4 right-4 z-50 space-y-2" role="status">{t.map(i => <div key={i.id} className={`rounded-lg px-4 py-2 text-sm text-white shadow-lg ${i.type === 'err' ? 'bg-red-600' : 'bg-slate-900'}`}>{i.msg}</div>)}</div>
}
export const Card = ({ className = '', ...p }) => <div className={`rounded-2xl border border-line bg-card p-5 shadow-sm ${className}`} {...p} />
export const Btn = ({ variant = 'primary', className = '', ...p }) => <button className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${variant === 'primary' ? 'bg-primary text-white hover:bg-primary/90' : variant === 'danger' ? 'text-red-600 hover:bg-red-500/10' : 'border border-line hover:bg-soft'} ${className}`} {...p} />
export const Loading = ({ text = 'Loading...' }) => <div className="flex items-center gap-2 p-8 text-muted"><Loader2 className="animate-spin" size={18} />{text}</div>
export const ox = ({ text, retry }) => <Card className="flex items-center gap-3 border-red-200 bg-red-500/10 text-red-700"><AlertCircle size={18} /><span className="flex-1 text-sm">{text}</span>{retry && <Btn variant="ghost" onClick={retry}>Retry</Btn>}</Card>
export const Empty = ({ text, children }) => <Card className="flex flex-col items-center gap-3 py-12 text-center text-muted"><Inbox size={28} /><p>{text}</p>{children}</Card>
export const Bar = ({ value }) => <div className="h-2 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} /></div>
export const Field = ({ label, children }) => <label className="block text-sm font-medium text-muted">{label}<div className="mt-1 font-normal">{children}</div></label>
export const inp = 'w-full rounded-lg border border-line bg-card px-3 py-2 text-sm'
export const Skeleton = () => <div className="space-y-4" role="status" aria-label="Loading"><div className="h-8 w-1/3 animate-pulse rounded bg-soft" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-soft" />)}</div><div className="h-48 animate-pulse rounded-2xl bg-soft" /></div>
export function Async({ f, children }) { return f.loading && !f.data ? <Skeleton /> : f.error ? <ErrorBox text={f.error} retry={f.reload} /> : children(f.data) }
