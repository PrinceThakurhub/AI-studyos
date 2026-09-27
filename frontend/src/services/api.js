const BASE = 'http://localhost:8000'
const MSG = { 404: 'Not found.', 413: 'File is too large. Maximum size is 15 MB.', 415: 'Please upload a valid PDF.',
  422: 'This PDF could not be processed. Scanned PDFs may not be supported.', 503: 'AI service is unavailable. Check your API key or try again.' }
async function req(path, opts) {
  let r
  const tok = localStorage.getItem('token')
  opts = { ...opts, headers: { ...(opts && opts.headers), ...(tok ? { Authorization: 'Bearer ' + tok } : {}) } }
  try { r = await fetch(BASE + path, opts) } catch { throw new Error('Cannot reach the backend. Is it running on localhost:8000?') }
  if (r.status === 204) return null
  if (r.status === 401 && !path.startsWith('/auth/google')) { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login' }
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : MSG[r.status] || 'Please check your input (' + r.status + ').')
  return d
}
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
export const getDashboard = () => req('/dashboard')
export const getAnalytics = () => req('/analytics')
export const getSubjects = () => req('/subjects')
export const createSubject = (b) => req('/subjects', json('POST', b))
export const updateSubject = (id, b) => req('/subjects/' + id, json('PUT', b))
export const deleteSubject = (id) => req('/subjects/' + id, { method: 'DELETE' })
export const getDocuments = () => req('/documents')
export const uploadDocument = (subject_id, file) => { const f = new FormData(); f.append('subject_id', subject_id); f.append('file', file); return req('/documents/upload', { method: 'POST', body: f }) }
export const deleteDocument = (id) => req('/documents/' + id, { method: 'DELETE' })
export const chatWithTutor = (b) => req('/ai/chat', json('POST', b))
export const getChatHistory = () => req('/ai/history')
export const generateQuiz = (b) => req('/quiz/generate', json('POST', b))
export const submitQuiz = (b) => req('/quiz/attempt', json('POST', b))
export const googleLogin = (credential) => req('/auth/google', json('POST', { credential }))
