import sqlite3, pathlib
DB = pathlib.Path(__file__).resolve().parent.parent / "database" / "studyos.db"

def conn():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON"); return c

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY, name TEXT NOT NULL, is_demo INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS topics(id INTEGER PRIMARY KEY, subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY, subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE, filename TEXT, path TEXT, content TEXT, status TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS quizzes(id INTEGER PRIMARY KEY, subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE, topic TEXT, difficulty TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS quiz_questions(id INTEGER PRIMARY KEY, quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE, question TEXT, options TEXT, correct INTEGER, explanation TEXT);
CREATE TABLE IF NOT EXISTS quiz_attempts(id INTEGER PRIMARY KEY, quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE, subject_id INTEGER, score INTEGER, total INTEGER, percentage REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS quiz_answers(id INTEGER PRIMARY KEY, attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE, question_id INTEGER, chosen INTEGER, is_correct INTEGER);
CREATE TABLE IF NOT EXISTS study_sessions(id INTEGER PRIMARY KEY, subject_id INTEGER, document_id INTEGER, question TEXT, answer TEXT, used_document INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS activities(id INTEGER PRIMARY KEY, kind TEXT, detail TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
"""
DEMO = {"Physics": ["Black Body Radiation", "Planck's Quantum Theory", "Wave-Particle Duality", "de Broglie Matter Waves", "Heisenberg Uncertainty Principle"],
        "Programming": ["Variables and Data Types", "Loops", "Functions", "OOP Basics"],
        "Mathematics": ["Matrices", "Differentiation", "Integration"]}

def init():
    c = conn(); c.executescript(SCHEMA)
    for col in ('email TEXT','picture TEXT'):
        try: c.execute('ALTER TABLE users ADD COLUMN '+col)
        except sqlite3.OperationalError: pass  # already migrated
    if not c.execute("SELECT 1 FROM subjects").fetchone():  # demo rows flagged is_demo=1
        for name, topics in DEMO.items():
            sid = c.execute("INSERT INTO subjects(name,is_demo) VALUES(?,1)", (name,)).lastrowid
            c.executemany("INSERT INTO topics(subject_id,name) VALUES(?,?)", [(sid, t) for t in topics])
    c.commit(); c.close()

def log(c, kind, detail):
    c.execute("INSERT INTO activities(kind,detail) VALUES(?,?)", (kind, detail))
