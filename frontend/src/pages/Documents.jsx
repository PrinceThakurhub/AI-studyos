import { useState } from 'react'
import { Upload, Trash2, FileText } from 'lucide-react'
import { getDocuments, getSubjects, uploadDocument, deleteDocument } from '../services/api'
import useFetch from '../hooks/useFetch'
import { Card, Btn, Async, Empty, Field, inp, toast } from '../components/ui'
export default function Documents() {
  const docs = useFetch(getDocuments); const subs = useFetch(getSubjects); const [sid, setSid] = useState(''); const [stage, setStage] = useState('')
  const pick = async file => {
    if (!file) return
    if (!sid) return toast('Select a subject first.', 'err')
    if (!file.name.toLowerCase().endsWith('.pdf')) return toast('Please upload a valid PDF.', 'err')
    if (file.size > 15 * 1024 * 1024) return toast('File is too large. Maximum size is 15 MB.', 'err')
    setStage('Uploading...'); const t = setTimeout(() => setStage('Processing PDF...'), 600)
    try { await uploadDocument(sid, file); setStage('Ready ✓'); toast('Document uploaded successfully.'); docs.reload() } catch (e) { setStage(''); toast(e.message, 'err') }
    clearTimeout(t)
  }
  const del = async d => { try { await deleteDocument(d.id); toast('Document deleted.'); docs.reload() } catch (e) { toast(e.message, 'err') } }
  return <div className="space-y-6">
    <Card className="space-y-3"><Async f={subs}>{s => <Field label="Subject"><select className={inp} value={sid} onChange={e => setSid(e.target.value)}><option value="">Select subject...</option>{s.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}</Async>
      <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]) }} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line p-8 text-center text-muted hover:border-primary">
        <Upload /><span>Drag & drop a PDF or <b className="text-primary">choose PDF</b> (max 15 MB)</span><input type="file" accept="application/pdf" className="sr-only" onChange={e => { pick(e.target.files[0]); e.target.value = '' }} />
        {stage && <span className="font-medium text-primary" role="status">{stage}</span>}</label></Card>
    <Async f={docs}>{d => !d.length ? <Empty text="No study material uploaded yet." /> : <div className="space-y-3">{d.map(x => <Card key={x.id} className="flex items-center gap-4 !p-4"><FileText className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1"><p className="truncate font-medium">{x.filename}</p><p className="text-xs text-muted">{x.subject} · {x.created_at} · {x.characters} characters · <span className="text-green-600">{x.status === 'ready' ? 'Ready ✓' : x.status}</span></p></div>
      <Btn variant="danger" aria-label={`Delete ${x.filename}`} onClick={() => del(x)}><Trash2 size={16} /></Btn></Card>)}</div>}</Async></div>
}
