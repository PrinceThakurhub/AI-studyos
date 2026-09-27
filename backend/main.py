import json, pathlib, uuid
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pypdf import PdfReader
import db, ai, auth

UPLOADS = pathlib.Path(__file__).resolve().parent.parent / "uploads"
MAX_MB = 15
app = FastAPI(title="AI StudyOS")
app.add_middleware(auth.AuthMiddleware)  # added first so CORS wraps it (401s keep CORS headers)
app.include_router(auth.router)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def _s(): db.init()

def rows(q, *a):
    c = db.conn(); r = [dict(x) for x in c.execute(q, a).fetchall()]; c.close(); return r

def progress(c, sid):
    r = c.execute("SELECT AVG(percentage) p FROM quiz_attempts WHERE subject_id=?", (sid,)).fetchone()["p"]
    return round(r) if r is not None else 0

# ---------- Subjects ----------
class SubjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    topics: list[str] = []

@app.post("/subjects", status_code=201)
def create_subject(s: SubjectIn):
    c = db.conn(); sid = c.execute("INSERT INTO subjects(name) VALUES(?)", (s.name.strip(),)).lastrowid
    c.executemany("INSERT INTO topics(subject_id,name) VALUES(?,?)", [(sid, t.strip()) for t in s.topics if t.strip()])
    db.log(c, "subject", f"Created subject {s.name}"); c.commit(); c.close(); return {"id": sid}

@app.get("/subjects")
def list_subjects():
    c = db.conn(); out = []
    for s in c.execute("SELECT * FROM subjects ORDER BY id").fetchall():
        d = dict(s); i = d["id"]
        d["progress"] = progress(c, i)
        d["documents"] = c.execute("SELECT COUNT(*) n FROM documents WHERE subject_id=?", (i,)).fetchone()["n"]
        d["quizzes"] = c.execute("SELECT COUNT(*) n FROM quizzes WHERE subject_id=?", (i,)).fetchone()["n"]
        d["topics"] = [t["name"] for t in c.execute("SELECT name FROM topics WHERE subject_id=?", (i,))]
        out.append(d)
    c.close(); return out

@app.get("/subjects/{sid}")
def get_subject(sid: int):
    s = next((x for x in list_subjects() if x["id"] == sid), None)
    if not s: raise HTTPException(404, "Subject not found")
    return s

@app.put("/subjects/{sid}")
def edit_subject(sid: int, s: SubjectIn):
    c = db.conn()
    if not c.execute("UPDATE subjects SET name=? WHERE id=?", (s.name.strip(), sid)).rowcount: raise HTTPException(404, "Subject not found")
    if s.topics:
        c.execute("DELETE FROM topics WHERE subject_id=?", (sid,))
        c.executemany("INSERT INTO topics(subject_id,name) VALUES(?,?)", [(sid, t.strip()) for t in s.topics if t.strip()])
    c.commit(); c.close(); return {"ok": True}

@app.delete("/subjects/{sid}", status_code=204)
def delete_subject(sid: int):
    c = db.conn()
    if not c.execute("DELETE FROM subjects WHERE id=?", (sid,)).rowcount: raise HTTPException(404, "Subject not found")
    c.commit(); c.close()

# ---------- Documents ----------
@app.post("/documents/upload", status_code=201)
async def upload(subject_id: int = Form(...), file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf") or file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(415, "Unsupported file type. Please upload a PDF.")
    data = await file.read()
    if len(data) > MAX_MB * 1024 * 1024: raise HTTPException(413, f"File too large (max {MAX_MB} MB).")
    if not data.startswith(b"%PDF"): raise HTTPException(415, "This file is not a valid PDF.")
    c = db.conn()
    if not c.execute("SELECT 1 FROM subjects WHERE id=?", (subject_id,)).fetchone(): raise HTTPException(404, "Subject not found")
    path = UPLOADS / f"{uuid.uuid4().hex}.pdf"; path.write_bytes(data)  # random name; never executed
    try:
        text = "\n".join((p.extract_text() or "") for p in PdfReader(path).pages).strip()
        if not text: raise ValueError("no text")
    except Exception:
        path.unlink(missing_ok=True); c.close()
        raise HTTPException(422, "Unable to process this document. Please try another PDF (scanned PDFs are not supported).")
    name = pathlib.Path(file.filename).name
    did = c.execute("INSERT INTO documents(subject_id,filename,path,content,status) VALUES(?,?,?,?,'ready')", (subject_id, name, str(path), text)).lastrowid
    db.log(c, "document", f"Uploaded {name}"); c.commit(); c.close()
    return {"id": did, "filename": name, "status": "ready", "characters": len(text)}

@app.get("/documents")
def list_documents(subject_id: int | None = None):
    q = "SELECT d.id,d.filename,d.status,d.created_at,d.subject_id,s.name subject,LENGTH(d.content) characters FROM documents d JOIN subjects s ON s.id=d.subject_id"
    return rows(q + (" WHERE d.subject_id=?" if subject_id else "") + " ORDER BY d.id DESC", *([subject_id] if subject_id else []))

@app.delete("/documents/{did}", status_code=204)
def delete_document(did: int):
    c = db.conn(); r = c.execute("SELECT path FROM documents WHERE id=?", (did,)).fetchone()
    if not r: raise HTTPException(404, "Document not found")
    pathlib.Path(r["path"]).unlink(missing_ok=True); c.execute("DELETE FROM documents WHERE id=?", (did,)); c.commit(); c.close()

# ---------- AI ----------
class ChatIn(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    subject_id: int | None = None
    document_id: int | None = None

@app.post("/ai/chat")
def chat(b: ChatIn):
    c = db.conn(); src = None; fname = None
    if b.document_id:
        r = c.execute("SELECT filename,content FROM documents WHERE id=?", (b.document_id,)).fetchone()
        if not r: raise HTTPException(404, "Document not found")
        src, fname = r["content"], r["filename"]
    try: ans = ai.tutor(b.question, src)
    except ai.AIError as e: raise HTTPException(503, str(e))
    c.execute("INSERT INTO study_sessions(subject_id,document_id,question,answer,used_document) VALUES(?,?,?,?,?)", (b.subject_id, b.document_id, b.question, ans, int(bool(src))))
    db.log(c, "ai_session", b.question[:80]); c.commit(); c.close()
    return {"answer": ans, "source": fname, "used_document": bool(src)}  # source only when doc really used

@app.get("/ai/history")
def history(): return rows("SELECT id,question,answer,used_document,created_at FROM study_sessions ORDER BY id DESC LIMIT 50")

# ---------- Quiz ----------
class QuizGenIn(BaseModel):
    subject_id: int
    topic: str = Field(min_length=1, max_length=120)
    difficulty: str = Field(pattern="^(Easy|Medium|Hard)$")
    count: int = Field(ge=1, le=10)
    document_id: int | None = None

@app.post("/quiz/generate", status_code=201)
def gen_quiz(b: QuizGenIn):
    c = db.conn(); s = c.execute("SELECT name FROM subjects WHERE id=?", (b.subject_id,)).fetchone()
    if not s: raise HTTPException(404, "Subject not found")
    d = c.execute("SELECT content FROM documents WHERE id=?", (b.document_id,)).fetchone() if b.document_id else None
    try: qs = ai.quiz(s["name"], b.topic, b.difficulty, b.count, d["content"] if d else None)
    except ai.AIError as e: raise HTTPException(503, str(e))
    qid = c.execute("INSERT INTO quizzes(subject_id,topic,difficulty) VALUES(?,?,?)", (b.subject_id, b.topic, b.difficulty)).lastrowid
    ids = [c.execute("INSERT INTO quiz_questions(quiz_id,question,options,correct,explanation) VALUES(?,?,?,?,?)",
           (qid, q["question"], json.dumps(q["options"]), q["correct"], q["explanation"])).lastrowid for q in qs]
    c.commit(); c.close()
    return {"quiz_id": qid, "questions": [{"id": i, "question": q["question"], "options": q["options"]} for i, q in zip(ids, qs)]}  # answers withheld

class AttemptIn(BaseModel):
    quiz_id: int
    answers: dict[int, int]  # question_id -> chosen option index

@app.post("/quiz/attempt", status_code=201)
def attempt(b: AttemptIn):
    c = db.conn(); qz = c.execute("SELECT * FROM quizzes WHERE id=?", (b.quiz_id,)).fetchone()
    if not qz: raise HTTPException(404, "Quiz not found")
    qs = c.execute("SELECT * FROM quiz_questions WHERE quiz_id=?", (b.quiz_id,)).fetchall()
    before = progress(c, qz["subject_id"])
    review, score = [], 0
    for q in qs:
        ch = b.answers.get(q["id"]); ok = ch == q["correct"]; score += ok
        review.append({"question_id": q["id"], "question": q["question"], "options": json.loads(q["options"]), "chosen": ch, "correct": q["correct"], "is_correct": ok, "explanation": q["explanation"]})
    pct = round(score / len(qs) * 100, 1)
    aid = c.execute("INSERT INTO quiz_attempts(quiz_id,subject_id,score,total,percentage) VALUES(?,?,?,?,?)", (b.quiz_id, qz["subject_id"], score, len(qs), pct)).lastrowid
    c.executemany("INSERT INTO quiz_answers(attempt_id,question_id,chosen,is_correct) VALUES(?,?,?,?)", [(aid, r["question_id"], r["chosen"], int(r["is_correct"])) for r in review])
    db.log(c, "quiz", f"Quiz on {qz['topic']}: {score}/{len(qs)}"); c.commit()
    after = progress(c, qz["subject_id"]); c.close()
    return {"attempt_id": aid, "score": score, "total": len(qs), "percentage": pct, "correct": score, "incorrect": len(qs) - score,
            "progress_before": before, "progress_after": after, "review": review}

# ---------- Dashboard / Analytics ----------
@app.get("/dashboard")
def dashboard():
    c = db.conn(); n = lambda t: c.execute(f"SELECT COUNT(*) n FROM {t}").fetchone()["n"]
    avg = c.execute("SELECT AVG(percentage) a FROM quiz_attempts").fetchone()["a"]
    out = {"subjects": n("subjects"), "documents": n("documents"), "quizzes_completed": n("quiz_attempts"),
           "average_score": round(avg) if avg is not None else None}
    c.close(); out["subject_progress"] = [{"name": s["name"], "progress": s["progress"]} for s in list_subjects()]
    out["recent_activity"] = rows("SELECT kind,detail,created_at FROM activities ORDER BY id DESC LIMIT 8"); return out

@app.get("/analytics")
def analytics():
    d = dashboard()
    if not d["quizzes_completed"]: return {"has_data": False, "message": "Not enough data yet. Complete your first quiz to see analytics."}
    weak = rows("""SELECT q.topic, ROUND(AVG(a.percentage)) avg_score, COUNT(*) attempts FROM quiz_attempts a JOIN quizzes q ON q.id=a.quiz_id
                   GROUP BY q.topic HAVING avg_score < 70 ORDER BY avg_score LIMIT 5""")
    return {"has_data": True, "average_score": d["average_score"], "attempts": d["quizzes_completed"], "subject_progress": d["subject_progress"],
            "recent_activity": d["recent_activity"], "weak_topics": weak,
            "attempt_history": rows("SELECT id,percentage,created_at FROM quiz_attempts ORDER BY id DESC LIMIT 20")}
