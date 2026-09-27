import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { nav } from '../utils/nav'
import { getSubjects, getDocuments } from '../services/api'
import { toggleTheme } from '../utils/theme'
export default function CommandPalette({ open, onClose }) {
  const go = useNavigate(); const [q, setQ] = useState(''); const [i, setI] = useState(0); const [extra, setExtra] = useState([]); const ref = useRef()
  useEffect(() => { if (!open) return; setQ(''); setI(0); ref.current?.focus()
    Promise.all([getSubjects(), getDocuments()]).then(([s, d]) => setExtra([...s.map(x => ({ label: 'Subject → ' + x.name, run: () => go('/subjects/' + x.id) })), ...d.map(x => ({ label: 'Document → ' + x.filename, run: () => go('/documents') }))])).catch(() => {}) }, [open])
  if (!open) return null
  const all = [...nav.map(([to, l]) => ({ label: 'Open ' + l, run: () => go(to) })), { label: 'Start Quiz', run: () => go('/quiz') }, { label: 'Ask AI Tutor', run: () => go('/ai-tutor') }, { label: 'Upload Document', run: () => go('/documents') }, { label: 'Toggle dark mode', run: toggleTheme }, ...extra]
  const list = all.filter(a => a.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  const pick = a => { onClose(); a?.run() }
  const key = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, list.length - 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)) } if (e.key === 'Enter') pick(list[i]) }
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]" onClick={onClose}><div role="dialog" aria-label="Command palette" className="w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-xl" onClick={e => e.stopPropagation()}>
    <div className="flex items-center gap-2 border-b px-4"><Search size={16} className="text-muted" /><input ref={ref} value={q} onChange={e => { setQ(e.target.value); setI(0) }} onKeyDown={key} placeholder="Search subjects, documents, commands..." className="w-full bg-transparent py-3 text-sm outline-none" aria-label="Search" /></div>
    <ul className="max-h-72 overflow-y-auto p-2">{list.length ? list.map((a, n) => <li key={a.label}><button onClick={() => pick(a)} onMouseEnter={() => setI(n)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${n === i ? 'bg-primary/10 text-primary' : ''}`}>{a.label}</button></li>) : <li className="p-3 text-sm text-muted">No results.</li>}</ul></div></div>
}
