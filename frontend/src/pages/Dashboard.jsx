import { Link } from 'react-router-dom'
import { Bot, Upload, ListChecks, Sparkles } from 'lucide-react'
import { getDashboard, getAnalytics } from '../services/api'
import useFetch from '../hooks/useFetch'
import { Card, Btn, Bar, Async } from '../components/ui'
function Recommendation({ a, avg }) {
  const weak = a?.has_data ? a.weak_topics[0] : null
  const r = weak ? { t: `${weak.topic} needs attention today.`, why: [`Your average on this topic is ${weak.avg_score}% across ${weak.attempts} quiz attempt(s).`, 'That is below the 70% mastery mark.'], main: ['Practice Quiz', '/quiz'] }
    : a?.has_data ? { t: "You're on track.", why: [`Average ${avg}% across ${a.attempts} attempt(s).`, 'No topic is below 70%. Try a harder quiz.'], main: ['Take another quiz', '/quiz'] }
    : { t: "Let's find out what to study first.", why: ['StudyOS needs quiz results to spot weak topics.', 'Take one short quiz to get your first recommendation.'], main: ['Start a quiz', '/quiz'] }
  return <Card className="border-primary/40"><p className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles size={16} />Your Recommendation</p>
    <h3 className="mt-2 text-xl font-semibold">{r.t}</h3>
    <details className="mt-2 text-sm text-muted" open><summary className="cursor-pointer">Why this recommendation?</summary><ul className="mt-1 list-disc pl-5">{r.why.map(w => <li key={w}>{w}</li>)}</ul><p className="mt-1 text-xs">Based on your saved quiz results.</p></details>
    <div className="mt-4 flex flex-wrap gap-2"><Link to={r.main[1]}><Btn>{r.main[0]}</Btn></Link><Link to="/ai-tutor"><Btn variant="ghost">Ask AI Tutor</Btn></Link></div></Card>
}
export default function Dashboard() {
  const f = useFetch(getDashboard); const an = useFetch(getAnalytics)
  const h = new Date().getHours(); const name = (JSON.parse(localStorage.getItem('user') || '{}').name || '').split(' ')[0]
  return <Async f={f}>{d => <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Good {h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}{name && `, ${name}`} 👋</h2><p className="text-muted">Here's your study command center for today.</p></div>
    <Recommendation a={an.data} avg={d.average_score} />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[['Subjects', d.subjects], ['Documents', d.documents], ['Quizzes Completed', d.quizzes_completed], ['Average Score', d.average_score == null ? null : d.average_score + '%']].map(([l, v]) =>
      <Card key={l}><p className="text-sm text-muted">{l}</p><p className="mt-1 text-2xl font-bold">{v ?? <span className="text-sm font-normal text-muted">No quiz data yet</span>}</p></Card>)}</div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Ask AI Tutor', '/ai-tutor', Bot], ['Upload Document', '/documents', Upload], ['Start Quiz', '/quiz', ListChecks]].map(([l, to, I]) => <Link key={l} to={to} className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm font-medium hover:border-primary"><I size={18} className="text-primary" />{l}</Link>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h3 className="mb-4 font-semibold">Learning health</h3>{d.subject_progress.length ? <div className="space-y-4">{d.subject_progress.map(s => <div key={s.name}><div className="mb-1 flex justify-between text-sm"><span>{s.name}</span><span>{s.progress}%</span></div><Bar value={s.progress} /></div>)}</div> : <p className="text-sm text-muted">No subjects yet. Create your first subject.</p>}</Card>
      <Card><h3 className="mb-4 font-semibold">Recent activity</h3>{d.recent_activity.length ? <ul className="space-y-3 text-sm">{d.recent_activity.map((a, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0 break-words"><b className="capitalize">{a.kind.replace('_', ' ')}</b>: {a.detail}</span><span className="shrink-0 text-xs text-muted">{a.created_at}</span></li>)}</ul> : <p className="text-sm text-muted">No activity yet. Upload a document or take a quiz.</p>}</Card></div>
  </div>}</Async>
}
