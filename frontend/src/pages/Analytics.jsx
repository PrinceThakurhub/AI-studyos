import { Link } from 'react-router-dom'
import { getAnalytics } from '../services/api'
import useFetch from '../hooks/useFetch'
import { Card, Bar, Async, Btn } from '../components/ui'
export default function Analytics() {
  const f = useFetch(getAnalytics)
  return <Async f={f}>{d => !d.has_data ? <Card className="flex flex-col items-center gap-3 py-14 text-center"><p className="text-4xl">📊</p><h2 className="text-lg font-semibold">No analytics yet</h2><p className="text-muted">Complete your first quiz to start tracking your performance.</p><Link to="/quiz"><Btn>Take a Quiz</Btn></Link></Card> :
    <div className="space-y-4"><div className="grid grid-cols-2 gap-4"><Card><p className="text-sm text-muted">Average Score</p><p className="text-3xl font-bold">{d.average_score}%</p></Card><Card><p className="text-sm text-muted">Attempts</p><p className="text-3xl font-bold">{d.attempts}</p></Card></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h3 className="mb-3 font-semibold">Subject progress</h3><div className="space-y-3">{d.subject_progress.map(s => <div key={s.name}><div className="flex justify-between text-sm"><span>{s.name}</span><span>{s.progress}%</span></div><Bar value={s.progress} /></div>)}</div></Card>
        <Card><h3 className="mb-3 font-semibold">Weak topics (&lt;70%)</h3>{d.weak_topics.length ? d.weak_topics.map(w => <p key={w.topic} className="flex justify-between text-sm"><span>{w.topic}</span><span>{w.avg_score}%</span></p>) : <p className="text-sm text-muted">No weak topics. Great work!</p>}</Card>
        <Card><h3 className="mb-3 font-semibold">Attempt history</h3><div className="flex h-32 items-end gap-1">{[...d.attempt_history].reverse().map(a => <div key={a.id} title={`${a.percentage}%`} className="flex-1 rounded-t bg-primary" style={{ height: `${Math.max(a.percentage, 3)}%` }} />)}</div></Card>
        <Card><h3 className="mb-3 font-semibold">Recent activity</h3><ul className="space-y-2 text-sm">{d.recent_activity.map((a, i) => <li key={i}>{a.detail}</li>)}</ul></Card></div></div>}</Async>
}
