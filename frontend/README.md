# AI StudyOS — frontend
Needs the FastAPI backend running at http://localhost:8000 (see root README).
`npm install` then `npm run dev` → http://localhost:5173
API base URL is set in `src/services/api.js`.

## Google login setup
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.
2. Authorized JavaScript origins: `http://localhost:5173` (no redirect URI needed).
3. Put the Client ID in root `.env` (`GOOGLE_CLIENT_ID`, plus a long random `SESSION_SECRET`) and in `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`). Restart both servers.
