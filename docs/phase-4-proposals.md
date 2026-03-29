# Phase 4 — proposals (backlog)

These are **optional next steps** after your current app is stable. They deliberately **avoid** items you chose to skip earlier (no broker APIs, no multi-user “teams/coaches” product, no paid SaaS unless you want it later).

---

## 1. Reliability & data safety

- **Automated DB backups** (Atlas snapshots or scheduled `mongodump`) + documented restore steps.
- **Health dashboard** for admins (API + DB + disk for uploads) with simple `/api/health/details` behind auth.
- **Retention policy** for Cloudinary images (optional cleanup of orphans).

## 2. Portability & ownership

- **Full account export** (JSON): users, trades, journal entries, metadata — one download for migration or archive.
- **Import JSON** back into a fresh environment (disaster recovery / self-hosting move).

## 3. UX depth (still single-user)

- **Customizable dashboard**: show/hide cards, reorder, save layout in `localStorage` or user profile.
- **Dark/light theme** toggle (persisted) beyond system preference.
- **Keyboard shortcuts** on History / Add trade (power users).

## 4. PWA / offline-lite

- **Installable PWA** (`manifest`, icons): open journal like an app on phone.
- **Offline read cache** of last fetched trades (read-only; sync when online) — no broker sync required.

## 5. Gentle habits (no paid push services required)

- **Browser reminder** (Notification API): optional “daily journal” or “log closed trades” nudge — scheduled only while the tab/app is open, or use OS calendar as fallback doc.

## 6. Richer analytics (still local / your DB)

- **Equity vs time in deposit currency** with manual balance checkpoints (weekly account snapshot).
- **Drawdown chart** from cumulative equity curve.
- **Trade checklist** template per strategy (ICT steps) — checkbox log per trade.

## 7. Security hardening

- **Rate limiting** on `/api/auth/login` and `/api/auth/register`.
- **Refresh tokens** or shorter JWT + rotation (if you expose the API beyond localhost).
- **CORS lockdown** via env allowlist for production.

## 8. Developer ergonomics

- **Docker Compose** (Mongo local + backend + frontend) for one-command dev/prod-like runs.
- **GitHub Actions**: lint + test + build on push.
- **Seed script** for demo data (screenshots optional).

## 9. Optional “power user” API (your automation, not brokers)

- **Personal API keys** (hashed in DB) to `GET/POST` trades from your own scripts — still **your** server, **no** third-party market data APIs.

---

### Suggested order if you implement later

1. Backups + full JSON export (low risk, high peace of mind).  
2. Rate limiting + CORS for any public deploy.  
3. PWA shell + dashboard layout prefs.  
4. Drawdown / balance snapshots.  
5. Personal API keys if you actually script against the journal.

You can trim or reorder this list anytime; nothing here is required for the product to stay useful.
