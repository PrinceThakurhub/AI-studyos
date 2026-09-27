import { useEffect, useRef, useState } from 'react'
import {
  generateQuiz,
  submitQuiz,
  getSubjects,
  getDocuments
} from '../services/api'

import useFetch from '../hooks/useFetch'
import {
  Card,
  Btn,
  Bar,
  Loading,
  Field,
  inp,
  toast
} from '../components/ui'

const L = 'ABCD'

export default function Quiz() {
  const subs = useFetch(getSubjects)
  const docs = useFetch(getDocuments)

  const [f, setF] = useState({
    subject_id: '',
    topic: '',
    difficulty: 'Medium',
    count: 5,
    document_id: ''
  })

  const [busy, setBusy] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [i, setI] = useState(0)
  const [ans, setAns] = useState({})
  const [res, setRes] = useState(null)

  // Prevent old async requests from changing current state
  const requestId = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
      requestId.current += 1
    }
  }, [])

  const setField = (key) => (e) => {
    const value = e.target.value

    setF((prev) => ({
      ...prev,
      [key]: value,

      // If subject changes, clear selected document
      ...(key === 'subject_id'
        ? { document_id: '' }
        : {})
    }))
  }

  // ----------------------------------------
  // GENERATE QUIZ
  // ----------------------------------------

  const gen = async () => {
    // Prevent duplicate requests
    if (busy) return

    if (!f.subject_id) {
      toast('Please select a subject.', 'err')
      return
    }

    if (!f.topic.trim()) {
      toast('Please enter a topic.', 'err')
      return
    }

    const currentRequest = ++requestId.current

    setBusy(true)
    setRes(null)

    try {
      const payload = {
        subject_id: Number(f.subject_id),
        topic: f.topic.trim(),
        difficulty: f.difficulty,
        count: Number(f.count),
        document_id: f.document_id
          ? Number(f.document_id)
          : null
      }

      const data = await generateQuiz(payload)

      // Component was unmounted or another request became newer
      if (
        !mounted.current ||
        currentRequest !== requestId.current
      ) {
        return
      }

      // Validate backend response
      if (
        !data ||
        !data.quiz_id ||
        !Array.isArray(data.questions) ||
        data.questions.length === 0
      ) {
        throw new Error(
          'Quiz was generated, but no valid questions were returned.'
        )
      }

      // Validate each question
      const validQuestions = data.questions.filter(
        (q) =>
          q &&
          q.id != null &&
          typeof q.question === 'string' &&
          Array.isArray(q.options) &&
          q.options.length === 4
      )

      if (!validQuestions.length) {
        throw new Error(
          'The AI returned an invalid quiz format.'
        )
      }

      setQuiz({
        quiz_id: data.quiz_id,
        questions: validQuestions
      })

      setI(0)
      setAns({})
      setRes(null)

    } catch (e) {
      if (mounted.current && currentRequest === requestId.current) {
        toast(
          e?.message || 'Unable to generate quiz.',
          'err'
        )
      }
    } finally {
      if (
        mounted.current &&
        currentRequest === requestId.current
      ) {
        setBusy(false)
      }
    }
  }

  // ----------------------------------------
  // SUBMIT QUIZ
  // ----------------------------------------

  const submit = async () => {
    if (busy) return

    if (!quiz?.quiz_id) {
      toast('Quiz is not available.', 'err')
      return
    }

    if (!Array.isArray(quiz.questions) || !quiz.questions.length) {
      toast('Quiz questions are missing.', 'err')
      return
    }

    const currentRequest = ++requestId.current

    setBusy(true)

    try {
      const data = await submitQuiz({
        quiz_id: quiz.quiz_id,
        answers: ans
      })

      if (
        !mounted.current ||
        currentRequest !== requestId.current
      ) {
        return
      }

      if (!data || !Array.isArray(data.review)) {
        throw new Error(
          'Invalid response received while submitting quiz.'
        )
      }

      setRes(data)

      toast('Quiz submitted.')

    } catch (e) {
      if (mounted.current && currentRequest === requestId.current) {
        toast(
          e?.message || 'Unable to submit quiz.',
          'err'
        )
      }
    } finally {
      if (
        mounted.current &&
        currentRequest === requestId.current
      ) {
        setBusy(false)
      }
    }
  }

  // ----------------------------------------
  // LOADING
  // ----------------------------------------

  if (busy && !res) {
    return (
      <Loading
        text={
          quiz
            ? 'Submitting...'
            : 'Generating your quiz...'
        }
      />
    )
  }

  // ----------------------------------------
  // RESULT
  // ----------------------------------------

  if (res) {
    return (
      <div className="space-y-4">

        <Card className="text-center">
          <p className="text-5xl font-bold text-primary">
            {res.score} / {res.total}
          </p>

          <p className="text-xl">
            {res.percentage}%
          </p>

          <p className="mt-2 text-muted">
            Correct: {res.correct} · Incorrect: {res.incorrect}
          </p>

          <p className="mt-1 font-medium">
            Progress: {res.progress_before}% →{' '}
            {res.progress_after}%
          </p>

          <Btn
            className="mt-4"
            onClick={() => {
              setQuiz(null)
              setRes(null)
              setAns({})
              setI(0)
            }}
          >
            New Quiz
          </Btn>
        </Card>

        <h3 className="font-semibold">
          Review Answers
        </h3>

        {Array.isArray(res.review) &&
          res.review.map((r, n) => (
            <Card
              key={r.question_id ?? n}
              className={`space-y-1 text-sm ${
                r.is_correct
                  ? 'border-green-300'
                  : 'border-red-300'
              }`}
            >
              <p className="font-medium">
                {n + 1}. {r.question}
              </p>

              <p>
                Your answer:{' '}
                {r.chosen == null
                  ? 'Not answered'
                  : `${L[r.chosen]}. ${
                      r.options?.[r.chosen] ?? ''
                    }`}
              </p>

              <p>
                Correct answer:{' '}
                {r.correct == null
                  ? 'Unknown'
                  : `${L[r.correct]}. ${
                      r.options?.[r.correct] ?? ''
                    }`}
              </p>

              <p className="text-muted">
                {r.explanation}
              </p>
            </Card>
          ))}
      </div>
    )
  }

  // ----------------------------------------
  // ACTIVE QUIZ
  // ----------------------------------------

  if (quiz) {
    const questions = Array.isArray(quiz.questions)
      ? quiz.questions
      : []

    // IMPORTANT: prevents blank/crash
    if (!questions.length) {
      return (
        <Card className="mx-auto max-w-xl text-center">
          <p className="text-red-600">
            No valid questions found.
          </p>

          <Btn
            className="mt-4"
            onClick={() => {
              setQuiz(null)
              setAns({})
              setI(0)
            }}
          >
            Back to Quiz Setup
          </Btn>
        </Card>
      )
    }

    // Protect against invalid index
    const safeIndex = Math.min(
      Math.max(i, 0),
      questions.length - 1
    )

    const q = questions[safeIndex]

    if (
      !q ||
      !Array.isArray(q.options) ||
      q.options.length !== 4
    ) {
      return (
        <Card className="mx-auto max-w-xl text-center">
          <p className="text-red-600">
            This question could not be displayed.
          </p>

          <Btn
            className="mt-4"
            onClick={() => {
              setQuiz(null)
              setAns({})
              setI(0)
            }}
          >
            Start Again
          </Btn>
        </Card>
      )
    }

    const last = safeIndex === questions.length - 1

    return (
      <Card className="mx-auto max-w-2xl space-y-4">

        <p className="text-sm text-muted">
          Question {safeIndex + 1} / {questions.length}
        </p>

        <Bar
          value={
            ((safeIndex + 1) / questions.length) * 100
          }
        />

        <h3 className="text-lg font-semibold">
          {q.question}
        </h3>

        <div
          className="space-y-2"
          role="radiogroup"
        >
          {q.options.map((o, k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={ans[q.id] === k}
              onClick={() =>
                setAns((prev) => ({
                  ...prev,
                  [q.id]: k
                }))
              }
              className={`block w-full rounded-lg border p-3 text-left text-sm ${
                ans[q.id] === k
                  ? 'border-primary bg-primary/10'
                  : 'border-line hover:bg-soft'
              }`}
            >
              <b>{L[k]}.</b> {o}
            </button>
          ))}
        </div>

        <div className="flex justify-between">

          <Btn
            variant="ghost"
            disabled={safeIndex === 0 || busy}
            onClick={() =>
              setI((prev) => Math.max(0, prev - 1))
            }
          >
            Previous
          </Btn>

          {last ? (
            <Btn
              onClick={submit}
              disabled={busy}
            >
              {busy ? 'Submitting...' : 'Submit Quiz'}
            </Btn>
          ) : (
            <Btn
              onClick={() =>
                setI((prev) =>
                  Math.min(
                    questions.length - 1,
                    prev + 1
                  )
                )
              }
              disabled={busy}
            >
              Next
            </Btn>
          )}

        </div>
      </Card>
    )
  }

  // ----------------------------------------
  // QUIZ SETUP
  // ----------------------------------------

  const filteredDocs = (docs.data || []).filter(
    (d) =>
      !f.subject_id ||
      d.subject_id == f.subject_id
  )

  return (
    <Card className="mx-auto max-w-xl space-y-4">

      <h2 className="text-lg font-semibold">
        Generate a quiz
      </h2>

      <Field label="Subject">
        <select
          className={inp}
          value={f.subject_id}
          onChange={setField('subject_id')}
          id="quiz-subject"
          name="subject_id"
        >
          <option value="">
            Select...
          </option>

          {(subs.data || []).map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Topic">
        <input
          className={inp}
          value={f.topic}
          onChange={setField('topic')}
          placeholder="e.g. Wave-Particle Duality"
          id="quiz-topic"
          name="topic"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">

        <Field label="Difficulty">
          <select
            className={inp}
            value={f.difficulty}
            onChange={setField('difficulty')}
            id="quiz-difficulty"
            name="difficulty"
          >
            {['Easy', 'Medium', 'Hard'].map((d) => (
              <option key={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Questions">
          <select
            className={inp}
            value={f.count}
            onChange={setField('count')}
            id="quiz-count"
            name="count"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </Field>

      </div>

      <Field label="Document (optional)">
        <select
          className={inp}
          value={f.document_id}
          onChange={setField('document_id')}
          id="quiz-document"
          name="document_id"
        >
          <option value="">
            None
          </option>

          {filteredDocs.map((d) => (
            <option
              key={d.id}
              value={d.id}
            >
              {d.filename}
            </option>
          ))}
        </select>
      </Field>

      <Btn
        onClick={gen}
        disabled={busy}
      >
        {busy
          ? 'Generating...'
          : 'Generate Quiz'}
      </Btn>

    </Card>
  )
}