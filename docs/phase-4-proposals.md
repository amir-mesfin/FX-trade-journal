# Trade Journal System — Full Project Documentation

> **Living document.** Updated after every major phase. Covers architecture, decisions, and what was built.

---

## Phase 0 — Project Foundation

**Goal:** Set up a working monorepo with a React frontend, Node/Express backend, and MongoDB.

### What was built
- Vite + React frontend (`/frontend`)
- Express REST API backend (`/backend`)
- MongoDB via Mongoose (`Trade`, `User`, `JournalEntry` models)
- JWT-based authentication (register / login)
- Docker Compose for local dev (`docker-compose.yml`)
- `.env` / `.env.example` for both frontend and backend
- `.gitignore` to keep secrets out of version control

### Key files
| File | Purpose |
|---|---|
| `backend/server.js` | Express entry point, routes, CORS, middleware |
| `backend/models/User.js` | User schema (hashed password) |
| `backend/models/Trade.js` | Core trade schema |
| `backend/middleware/auth.js` | JWT verify middleware |
| `frontend/src/main.jsx` | React entry point |
| `frontend/src/App.jsx` | Router + protected routes |

---

## Phase 1 — Core Trade Logging

**Goal:** Users can log, view, edit, and delete trades through the web UI.

### What was built
- **TradeForm** (`/trades/new`, `/trades/:id/edit`) — full form with all price fields
- **TradeHistory** — paginated table with click-to-view detail panel
- **Trade model fields:** `pair`, `type`, `lotSize`, `entryPrice`, `stopLoss`, `takeProfit`, `exitPrice`, `profitLoss`, `rMultiple`, `strategy`, `notes`, `psychologyNote`, `openedAt`, `closedAt`, `status`
- Auto-calculated **Realized R** from entry → stop → exit (server-side)
- **Screenshot uploads** via Cloudinary (multipart form, server-side upload)
- Existing screenshots shown in edit mode; new images appended

### API routes
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/trades` | Create trade (JSON or multipart) |
| `GET` | `/api/trades` | List trades (paginated, filterable) |
| `GET` | `/api/trades/:id` | Single trade |
| `PATCH` | `/api/trades/:id` | Update trade |
| `DELETE` | `/api/trades/:id` | Delete + remove screenshots |

---

## Phase 2 — Analytics & Journal

**Goal:** Give users insight into their performance and a daily journal.

### What was built
- **Dashboard** — win rate, total P/L, average R, best/worst trade cards
- **Analytics page** — charts (P/L by pair, win rate by strategy, equity curve)
- **Calendar view** — daily P/L colour-coded on a month calendar
- **Journal page** — daily mood/notes separate from individual trades (`JournalEntry` model)
- **Stats filters** — filter by pair, strategy, date range across all analytics views
- **Insights panel** — auto-generated text callouts ("best pair: XAUUSD")

### API routes
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/stats` | Aggregate stats (win rate, totals, R) |
| `GET` | `/api/insights` | Text insight cards |
| `GET` | `/api/reports` | Filtered data for charts |
| `GET/POST/PATCH/DELETE` | `/api/journal` | Daily journal entries |

---

## Phase 3 — CSV Import / Export & Security

**Goal:** Let users import MT4/MT5 history and export their data. Harden auth.

### What was built
- **CSV import** — `POST /api/trades/import/csv` parses MetaTrader Account History CSV; duplicate tickets skipped via partial unique index (`externalId`)
- **CSV export** — `GET /api/trades/export/csv` streams filtered trades as a downloadable `.csv`
- **Import modal** in TradeHistory UI with result feedback (imported / skipped / errors)
- **Rate limiting** on auth routes
- **CORS lockdown** via env `ALLOWED_ORIGIN`
- **Cloudinary** cleanup (`removeStoredScreenshots`) on trade delete

### Notable implementation detail
> Multipart vs JSON detection in `handleUpload`: if `Content-Type` is not `multipart/form-data`, the middleware is skipped and JSON body is used directly. This avoids empty-body issues behind Render/Vercel proxies.

---

## Phase 4 — ICT Trading Model Integration ✅ (Current)

**Goal:** Convert the user's personal ICT trading model into structured, trackable data inside every trade.

### 4a — ICT Entry Checklist

Every trade now has an `entryChecklist` subdocument (11 boolean fields, all default `false`):

| Field | Step |
|---|---|
| `newsChecked` | Check news before 9:30 |
| `liquidityMarked` | Mark liquidity & PD array |
| `waitedNYOpen` | Wait NY open (9:30) |
| `liquiditySweep` | Wait liquidity sweep |
| `crtConfirmed` | CRT confirmation |
| `reversalSign` | Reversal sign |
| `mssDisplacement` | MSS + displacement |
| `bprIfvgFvg` | BPR → IFVG → FVG |
| `entryTaken` | Enter trade |
| `targetCRT` | Target CRT |
| `journaled` | Journal |

**TradeForm UI:** Interactive toggle cards — green when checked, dark when not. Live progress bar (`X/11 steps`).

**TradeHistory detail panel:** Read-only checklist with ✅ / ☐ icons per step + progress bar + step counter coloured by completeness.

### 4b — Risk Management Fields

Two new fields added to every trade:

| Field | Description |
|---|---|
| `riskAmount` | Dollar amount at risk (e.g. `$50`) |
| `riskPercent` | Percentage of account at risk (e.g. `1%`) |

**TradeForm UI:** Amber-highlighted card labelled "💰 Risk Management". When both fields are filled, shows a live **implied account size** (e.g. `$50 at 1% = $5,000 account`).

**TradeHistory detail panel:** Shown as `$50 · 1% of account` in the Risk row.

### Files changed in Phase 4
| File | Change |
|---|---|
| `backend/models/Trade.js` | Added `entryChecklist` subdocument + `riskAmount` + `riskPercent` |
| `backend/routes/trades.js` | Parse/save checklist (JSON string from multipart or object from JSON body) + risk fields in POST and PATCH |
| `frontend/src/pages/TradeForm.jsx` | Checklist UI + risk management card |
| `frontend/src/pages/TradeHistory.jsx` | Checklist read-only view + risk row in detail panel |

---

## Phase 5 — Proposed Next Steps (Backlog)

These are **optional** future improvements. Nothing here is required for the system to stay useful.

### 5.1 Reliability & data safety
- Automated DB backups (Atlas snapshots or `mongodump`) + documented restore
- Health dashboard endpoint `/api/health/details` (API + DB + disk) behind auth
- Cloudinary orphan image cleanup (retention policy)

### 5.2 Portability & ownership
- **Full JSON export** — users, trades, journal, metadata in one download
- **JSON import** back into fresh environment (disaster recovery / self-hosting move)

### 5.3 Analytics depth
- **Equity curve** in deposit currency with manual weekly balance checkpoints
- **Drawdown chart** from cumulative equity
- **Checklist compliance rate** — % of trades where all 11 ICT steps were followed
- **Per-step miss rate** — which individual checklist steps are most often skipped

### 5.4 UX improvements
- Customisable dashboard (show/hide cards, reorder)
- Dark/light theme toggle (persisted)
- Keyboard shortcuts in History / Add trade

### 5.5 PWA / offline-lite
- Installable PWA (`manifest.json` + icons) — open like a mobile app
- Offline read cache of last-fetched trades (sync when back online)

### 5.6 Security hardening
- Refresh tokens or shorter JWT + rotation
- Stricter CORS allowlist for production
- Content-Security-Policy headers

### 5.7 Developer ergonomics
- GitHub Actions — lint + typecheck + build on push
- Seed script for demo data
- E2E smoke tests (Playwright)

### 5.8 Personal automation API
- Personal API keys (hashed in DB) for `GET/POST` trades from your own scripts — **your** server, **no** third-party market data

---

### Suggested order if you continue

1. Checklist compliance analytics (natural next step after Phase 4)
2. Equity curve + drawdown charts
3. Full JSON export / import (peace of mind)
4. Rate limiting + refresh tokens (before any public deploy)
5. PWA shell + dashboard layout prefs
6. Personal API keys (if you script against the journal)

---

*Last updated: April 2026 — Phase 4 complete.*
