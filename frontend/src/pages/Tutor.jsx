import { useState, useRef, useEffect } from 'react'
import { Send, FileText, History } from 'lucide-react'
import {
  chatWithTutor,
  getChatHistory,
  getDocuments,
  getSubjects,
} from '../services/api'
import useFetch from '../hooks/useFetch'
import { Card, Btn, Loading, inp, toast } from '../components/ui'

const Md = ({ text }) => {
  const safeText =
    typeof text === 'string'
      ? text
      : text == null
        ? 'No answer was returned by the AI.'
        : String(text)

  return (
    <div className="space-y-1 text-sm">
      {safeText.split('\n').map((line, i) => {
        const c = line
          .replace(/\*\*/g, '')
          .replace(/^#+\s*/, '')

        if (!line.trim()) {
          return null
        }

        if (/^\s*[-*•]\s/.test(line)) {
          return (
            <p key={i} className="pl-4">
              • {c.replace(/^\s*[-*•]\s/, '')}
            </p>
          )
        }

        if (/^#|^\*\*.+\*\*$/.test(line.trim())) {
          return (
            <p key={i} className="pt-2 font-semibold">
              {c}
            </p>
          )
        }

        return <p key={i}>{c}</p>
      })}
    </div>
  )
}

export default function Tutor() {
  const subs = useFetch(getSubjects)
  const docs = useFetch(getDocuments)
  const hist = useFetch(getChatHistory)

  const [sid, setSid] = useState('')
  const [did, setDid] = useState('')
  const [q, setQ] = useState('')
  const [msgs, setMsgs] = useState([])
  const [busy, setBusy] = useState(false)

  const end = useRef(null)

  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [msgs, busy])

  const list = (docs.data || []).filter(
    (d) => !sid || d.subject_id == sid
  )

  const send = async () => {
    if (!q.trim()) {
      toast('Please type a question.', 'err')
      return
    }

    const question = q.trim()

    setQ('')
    setBusy(true)

    setMsgs((messages) => [
      ...messages,
      {
        role: 'user',
        text: question,
      },
    ])

    try {
      const r = await chatWithTutor({
        question,
        subject_id: sid ? +sid : null,
        document_id: did ? +did : null,
      })

      setMsgs((messages) => [
        ...messages,
        {
          role: 'ai',
          text: r?.answer ?? 'No answer was returned by the AI.',
          source: r?.used_document ? r.source : null,
        },
      ])

      hist.reload()
    } catch (e) {
      setMsgs((messages) => [
        ...messages,
        {
          role: 'err',
          text: e?.message || 'Something went wrong.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const openHistory = (h) => {
    setMsgs([
      {
        role: 'user',
        text: h.question,
      },
      {
        role: 'ai',
        text: h.answer,
        source: h.used_document
          ? 'a study document'
          : null,
      },
    ])
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <Card className="flex h-[70vh] flex-col !p-0">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <select
            aria-label="Subject"
            className={inp + ' !w-auto'}
            value={sid}
            onChange={(e) => {
              setSid(e.target.value)
              setDid('')
            }}
          >
            <option value="">All subjects</option>

            {(subs.data || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Document"
            className={inp + ' !w-auto max-w-full'}
            value={did}
            onChange={(e) => setDid(e.target.value)}
          >
            <option value="">
              No document (general question)
            </option>

            {list.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!msgs.length && (
            <p className="text-center text-muted">
              Try: "Explain Heisenberg uncertainty principle in
              simple language."
            </p>
          )}

          {msgs.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[80%] rounded-2xl bg-primary p-3 text-sm text-white'
                  : `max-w-[90%] rounded-2xl p-3 ${
                      m.role === 'err'
                        ? 'bg-red-500/10 text-sm text-red-700'
                        : 'bg-soft'
                    }`
              }
            >
              {m.role === 'ai' ? (
                <>
                  <Md text={m.text} />

                  <p className="mt-3 flex items-center gap-1 border-t pt-2 text-xs text-muted">
                    {m.source ? (
                      <>
                        <FileText size={12} />
                        Based on: {m.source}
                      </>
                    ) : (
                      'General AI response'
                    )}
                  </p>
                </>
              ) : (
                m.text
              )}
            </div>
          ))}

          {busy && <Loading text="AI is thinking..." />}

          <div ref={end} />
        </div>

        <div className="flex gap-2 border-t p-3">
          <input
            className={inp}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) {
                send()
              }
            }}
            placeholder="Ask anything about your study material..."
            aria-label="Question"
          />

          <Btn
            onClick={send}
            disabled={busy}
            aria-label="Send"
          >
            <Send size={16} />
          </Btn>
        </div>
      </Card>

      <Card className="h-fit space-y-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <History size={16} />
          Recent questions
        </h3>

        {!(hist.data || []).length ? (
          <p className="text-sm text-muted">
            No questions yet.
          </p>
        ) : (
          hist.data.slice(0, 10).map((h) => (
            <button
              key={h.id}
              className="block w-full truncate rounded-lg px-2 py-1 text-left text-sm hover:bg-soft"
              title={h.question}
              onClick={() => openHistory(h)}
            >
              {h.question}
            </button>
          ))
        )}
      </Card>
    </div>
  )
}