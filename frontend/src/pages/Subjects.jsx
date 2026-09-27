import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../services/api'
import useFetch from '../hooks/useFetch'
import { Card, Btn, Bar, Async, Empty, Field, inp, toast } from '../components/ui'
function Modal({ subject, onClose, onDone }) {
  const [name, setName] = useState(subject?.name || ''); const [topics, setTopics] = useState(subject?.topics || []); const [t, setT] = useState(''); const [busy, setBusy] = useState(false)
  const add = () => { if (!t.trim()) return toast('Topic cannot be empty.', 'err'); setTopics([...topics, t.trim()]); setT('') }
  const save = async () => {
    if (!name.trim()) return toast('Subject name is required.', 'err')
    setBusy(true)
    try { subject ? await updateSubject(subject.id, { name, topics }) : await createSubject({ name, topics }); toast(subject ? 'Subject updated.' : 'Subject created successfully.'); onDone() }
    catch (e) { toast(e.message, 'err'); setBusy(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Card className="w-full max-w-md space-y-4" role="dialog" aria-label="Subject form">
    <div className="flex justify-between"><h3 className="font-semibold">{subject ? 'Edit subject' : 'New subject'}</h3><button aria-label="Close" onClick={onClose}><X size={18} /></button></div>
    <Field label="Subject name"><input className={inp} value={name} onChange={e => setName(e.target.value)} maxLength={80} /></Field>
    <Field label="Topics"><div className="flex gap-2"><input className={inp} value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="e.g. Wave-Particle Duality" /><Btn variant="ghost" onClick={add}>Add Topic</Btn></div></Field>
    <div className="flex flex-wrap gap-2">{topics.map((x, i) => <span key={i} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{x}<button aria-label={`Remove ${x}`} onClick={() => setTopics(topics.filter((_, j) => j !== i))}><X size={12} /></button></span>)}</div>
    <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save'}</Btn></div></Card></div>
}
export default function Subjects() {
  const f = useFetch(getSubjects); const { id } = useParams(); const [modal, setModal] = useState(null)
  const del = async s => { if (!confirm(`Delete ${s.name} and its documents/quizzes?`)) return; try { await deleteSubject(s.id); toast('Subject deleted.'); f.reload() } catch (e) { toast(e.message, 'err') } }
  return <Async f={f}>{list => { const shown = id ? list.filter(s => s.id == id) : list
    return <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-muted">{id ? <Link to="/subjects" className="text-primary">← All subjects</Link> : `${list.length} subject(s)`}</p><Btn onClick={() => setModal({})}><Plus size={16} />New Subject</Btn></div>
      {!shown.length ? <Empty text="No subjects yet. Create your first subject." /> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{shown.map(s => <Card key={s.id} className="space-y-3">
        <div className="flex items-start justify-between gap-2"><Link to={`/subjects/${s.id}`} className="break-words text-lg font-semibold hover:text-primary">{s.name}</Link>{s.is_demo ? <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700">Demo</span> : null}</div>
        <div><div className="mb-1 flex justify-between text-xs text-muted"><span>Progress</span><span>{s.progress}%</span></div><Bar value={s.progress} /></div>
        <p className="text-xs text-muted">{s.documents} documents · {s.quizzes} quizzes · {s.topics.length} topics</p>
        <div className="flex flex-wrap gap-1">{s.topics.map(t => <span key={t} className="rounded-full bg-soft px-2 py-0.5 text-xs">{t}</span>)}</div>
        <div className="flex flex-wrap gap-1 border-t pt-3"><Link to="/documents"><Btn variant="ghost">Upload Material</Btn></Link><Link to="/ai-tutor"><Btn variant="ghost">Ask AI</Btn></Link><Link to="/quiz"><Btn variant="ghost">Quiz</Btn></Link>
          <Btn variant="ghost" aria-label="Edit" onClick={() => setModal(s)}><Pencil size={14} /></Btn><Btn variant="danger" aria-label="Delete" onClick={() => del(s)}><Trash2 size={14} /></Btn></div></Card>)}</div>}
      {modal && <Modal subject={modal.id ? modal : null} onClose={() => setModal(null)} onDone={() => { setModal(null); f.reload() }} />}</div> }}</Async>
}
