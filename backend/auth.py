import os, time, secrets, jwt
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as greq
import db
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
SECRET = os.getenv("SESSION_SECRET") or secrets.token_hex(32)  # random fallback: sessions reset on restart
OPEN = ("/auth/google", "/docs", "/openapi.json", "/redoc")
router = APIRouter(prefix="/auth")

def decode(tok):
    return jwt.decode(tok, SECRET, algorithms=["HS256"])

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, req: Request, call_next):
        if req.method == "OPTIONS" or req.url.path in OPEN: return await call_next(req)
        try: req.state.user_id = decode(req.headers.get("authorization", "")[7:])["uid"]
        except Exception: return JSONResponse({"detail": "Please sign in to continue."}, status_code=401)
        return await call_next(req)

class GoogleIn(BaseModel):
    credential: str

@router.post("/google")
def google_login(b: GoogleIn):
    if not CLIENT_ID or CLIENT_ID.startswith("your_"): raise HTTPException(503, "Google login is not configured. Set GOOGLE_CLIENT_ID in .env")
    try:
        info = id_token.verify_oauth2_token(b.credential, greq.Request(), CLIENT_ID)  # checks signature, audience, expiry
        if not info.get("email_verified"): raise ValueError("unverified")
    except Exception: raise HTTPException(401, "Google sign-in could not be verified.")
    c = db.conn(); u = c.execute("SELECT id FROM users WHERE email=?", (info["email"],)).fetchone()
    if u: uid = u["id"]; c.execute("UPDATE users SET name=?,picture=? WHERE id=?", (info.get("name"), info.get("picture"), uid))
    else: uid = c.execute("INSERT INTO users(name,email,picture) VALUES(?,?,?)", (info.get("name"), info["email"], info.get("picture"))).lastrowid
    c.commit(); c.close()
    tok = jwt.encode({"uid": uid, "exp": int(time.time()) + 7 * 86400}, SECRET, algorithm="HS256")
    return {"token": tok, "user": {"id": uid, "name": info.get("name"), "email": info["email"], "picture": info.get("picture")}}

@router.get("/me")
def me(request: Request):
    c = db.conn(); u = c.execute("SELECT id,name,email,picture FROM users WHERE id=?", (request.state.user_id,)).fetchone(); c.close()
    if not u: raise HTTPException(401, "Please sign in to continue.")
    return dict(u)
