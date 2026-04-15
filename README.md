# TalentAI — AI-Powered Candidate Onboarding Pipeline

A full end-to-end AI-augmented hiring system: from job listing to first day on Slack. Built as a functional prototype demonstrating every phase of an intelligent hiring pipeline.

---

## Live Demo

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # http://localhost:3000
```

- **Candidate Portal:** `http://localhost:3000/careers`
- **Admin Dashboard:** `http://localhost:3000/admin`
- **Schedule Interview:** `http://localhost:3000/schedule/<token>`
- **Sign Offer:** `http://localhost:3000/offer/<token>`

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack: server components for fast reads, API routes for backend logic, client components only where interactivity is needed |
| Database | Supabase (PostgreSQL) | Postgres + built-in file storage + Row Level Security — ideal for a hiring system with structured data and resume blobs |
| AI / LLM | Anthropic Claude (`claude-sonnet-4-6`) | Best-in-class reasoning for document analysis, structured JSON extraction, and professional writing tasks |
| Email | Resend | Modern email API with reliable deliverability; falls back to console log when key is absent |
| Calendar | Google Calendar API | Industry standard; mocked with realistic simulation when OAuth tokens are absent |
| Notetaker | Fireflies.ai GraphQL API | Only notetaker with a documented public API for transcript retrieval; mocked for demo |
| E-Signature | Custom Canvas UI (Option B) | Eliminates 3rd-party dependency, captures draw+type signatures with IP + timestamp, fully self-hosted |
| Messaging | Slack Web API | Native workspace invite + personalized AI DMs via SlackBot |
| Styling | Tailwind CSS | Utility-first, fast to write, no CSS file bloat |

---

## System Architecture

```
Candidate → /careers → /careers/[jobId] → /careers/[jobId]/apply
                                                    ↓
                                          POST /api/applications
                                          ├── Validates file (PDF/DOCX, <5MB)
                                          ├── Checks duplicate email+role
                                          ├── Checks job is active/not closed
                                          ├── Uploads resume to Supabase Storage
                                          ├── Sends confirmation email (Resend)
                                          └── Triggers async POST /api/screen
                                                      ↓
                                            AI Screening (Claude)
                                            ├── Parses resume text
                                            ├── Scores against JD (0-100)
                                            ├── Extracts skills/experience/employers
                                            └── If score >= threshold (65):
                                                ├── Moves to "shortlisted"
                                                ├── Runs candidate research (async)
                                                ├── Creates tentative calendar holds
                                                └── Sends scheduling email with token
                                                              ↓
                                                Candidate → /schedule/[token]
                                                ├── Selects slot
                                                └── POST /api/schedule/confirm
                                                    ├── Confirms slot on Google Calendar
                                                    ├── Releases other holds (conflict prevention)
                                                    ├── Creates interview record
                                                    ├── Schedules Fireflies bot
                                                    ├── Sends .ics calendar invite
                                                    └── Status: "in_interview"
                                                                  ↓
                                                    Interview happens (Fireflies joins)
                                                    POST /api/interview/webhook (Fireflies)
                                                    └── Stores transcript + summary
                                                                  ↓
                                                    Admin → POST /api/offers/generate
                                                    ├── Claude writes offer letter
                                                    ├── Admin reviews in dashboard
                                                    └── PUT /api/offers/generate (send)
                                                        ├── Emails candidate signing link
                                                        └── Status: "offer_sent"
                                                                      ↓
                                                        Candidate → /offer/[token]
                                                        └── POST /api/offers/sign
                                                            ├── Records signature + IP + timestamp
                                                            ├── Emails admin alert
                                                            ├── Status: "offer_signed"
                                                            └── Triggers POST /api/slack/onboard
                                                                ├── Claude generates welcome message
                                                                ├── Slack workspace invite
                                                                ├── Welcome DM to candidate
                                                                └── Notifies HR channel
```

---

## Phase-by-Phase Implementation

### Phase 01 — Career Portal & Job Listings

- **4 full job descriptions** seeded in the database (Senior AI Product Engineer, AI Product Operator, Head of Talent, Growth Marketing Manager)
- Candidate-facing `/careers` page with real Supabase data (ISR: 60s revalidation)
- Individual job detail pages with full JD, responsibilities, requirements
- Application form captures: name, email, LinkedIn, portfolio/GitHub, role (from URL), resume upload
- Application confirmation email via Resend

### Phase 02A — Admin Hiring Dashboard

- `/admin` overview with pipeline funnel chart (counts by status, conversion visualization)
- `/admin/candidates` table with filters: role, status, date range
- `/admin/candidates/[id]` full candidate profile: AI scores, research, status history, interview, offer
- Admin can override status + add a note → recorded in `status_history` table
- Re-run AI screening button for any candidate

### Phase 02B — AI Resume Screening

- Resume text extracted from PDF (pdf-parse) or DOCX (mammoth) server-side
- Claude prompt produces structured JSON: score (0-100), rationale, strengths, gaps, skills, years_experience, education, employers, achievements
- Score ≥ configurable threshold (default 65) → auto-shortlist + trigger scheduling
- Score below threshold → status stays "screened", visible in dashboard for human review
- Threshold configurable via `SHORTLIST_THRESHOLD` env var

### Phase 02C — Candidate Research & Profile Enrichment

- Runs asynchronously (non-blocking) after shortlist decision
- Claude generates LinkedIn summary, Twitter/X summary, GitHub summary, discrepancy flags
- 3–5 sentence executive brief for hiring manager (readable in <60 seconds)
- All research stored on `applications` record and surfaced in candidate profile
- **Approach note:** Research uses Claude's reasoning over submitted profile data (LinkedIn URL, GitHub URL, resume text). Production would integrate Perplexity API or Exa.ai for real-time web search results fed into Claude for synthesis.

### Phase 03 — Calendar Orchestration & Scheduling

- `lib/calendar.ts` implements full Google Calendar API flow (falls back to mock)
- When shortlisted: finds 4 available 45-min slots in next 5 business days
- **Conflict Prevention:** All slots immediately created as `status: 'tentative'` in DB AND as tentative holds on Google Calendar. Until the candidate confirms, ALL slots remain blocked. This prevents two candidates picking the same slot simultaneously.
- Candidate selects slot → confirmed slot updated to `status: 'confirmed'`, all others set to `status: 'released'` (and Google Calendar holds deleted)
- 48-hour nudge: `/api/schedule/nudge` endpoint checks for unused tokens older than 48h → sends reminder email. Designed to be called by a cron job (Vercel Cron, Supabase Edge Functions, or GitHub Actions).
- Calendar invite (.ics) attached to confirmation email — candidate can accept in Google Calendar without replying to email

### Phase 04 — Interview Notetaker (Fireflies.ai)

**Decision rationale:**
- **Fireflies.ai** chosen because it has a documented public GraphQL API (`api.fireflies.ai/graphql`)
- Fathom: no public API (invite-only webhooks only)
- Read.ai: MCP server for Claude Desktop only, no REST API
- Otter.ai: enterprise API, manual approval required

**Real integration flow:**
1. On interview scheduling, POST to Fireflies to schedule bot attendance at meeting URL
2. Fireflies bot auto-joins the Google Meet/Zoom at the scheduled time
3. After meeting ends, Fireflies calls our webhook at `/api/interview/webhook`
4. We query the Fireflies GraphQL API for full transcript + summary
5. Store against candidate's interview record

**Demo:** Returns realistic mock transcript including an AI-scored interview exchange. Admin can click "Fetch Transcript" to pull and store it.

### Phase 05 — Offer Letter Generation & E-Signature

**5A — Offer Generation:**
- Admin fills in: job title, start date, salary, equity/bonus, reporting manager, custom terms
- Claude generates complete professional letter with proper structure, at-will language, benefits overview, dual signature block
- Admin previews full letter before sending
- One-click send emails candidate a unique signing link

**5B — Custom E-Signature UI (Option B chosen):**
- Chose custom UI over DocuSign/PandaDoc to eliminate external dependency and keep data self-hosted
- Candidate can draw signature on canvas OR type name (rendered in italic serif font)
- On sign: records `signature_data` (base64 PNG), `signed_at` timestamp, `signer_ip` (from X-Forwarded-For)
- Signing immediately triggers: admin alert email + Slack onboarding sequence

### Phase 06 — Slack Onboarding

- On offer signature: Claude generates personalized welcome message using candidate profile, role, manager name, start date, and candidate brief
- Sends workspace invitation via `admin.users.invite` Slack API method
- Posts personalized DM with quick-links block (Notion, Calendar, GitHub, design system)
- Posts structured notification to HR channel with candidate details + deep link to profile
- **team_join webhook:** In production, Slack calls a webhook when the user joins; the `postWelcomeMessage` function is designed to be called from this event handler

---

## Database Schema

```sql
jobs                    -- Job listings with JDs
applications            -- Candidate applications + all AI results
status_history          -- Every status transition logged with actor + note
interview_slots         -- Calendar holds (tentative → confirmed/released)
interviews              -- Interview records with transcript + Fireflies ID
offer_letters           -- AI-generated offers + signature data
scheduling_tokens       -- Unique links for slot selection (expires in 5d)
```

---

## Edge Cases Handled

### 1. Duplicate Applications
**Problem:** Same email applying to same role twice.
**Solution:** `UNIQUE(email, job_id)` constraint in PostgreSQL. API returns HTTP 409 with the existing application ID and current status — so the candidate can reference their original application.

### 2. Slot Conflict Prevention (Scheduling Race Condition)
**Problem:** If 3 slots are offered, two candidates could select the same slot simultaneously before either is confirmed.
**Solution:** 
- All offered slots are immediately blocked as `tentative` in the DB AND as tentative holds on Google Calendar
- These holds persist until one is confirmed and the others are explicitly released
- `confirm` API uses a transaction: update confirmed → confirmed, update all others → released, delete Google Calendar holds
- This prevents any other candidate from being offered those slots (slots are only offered from available, non-held calendar time)

### 3. 48-Hour No-Response Nudge
**Problem:** Candidates go cold after receiving scheduling options.
**Solution:** `scheduling_tokens` table tracks `nudge_sent_at`. Cron endpoint `/api/schedule/nudge` (auth: Bearer token) runs hourly, finds tokens where `created_at < now() - 48h` AND `nudge_sent_at IS NULL` AND `used = false` AND `expires_at > now()`. Sends one nudge email. Safe to run repeatedly — won't double-nudge.

### 4. Invalid File Upload
**Problem:** Candidates upload wrong file types or huge files.
**Solution:** Client-side validation rejects non-PDF/DOCX and >5MB before upload begins. Server-side validation re-checks extension and size. Descriptive error messages explain exactly what's wrong.

### 5. Closed / Paused Jobs
**Problem:** Candidate applies for a role that was just closed.
**Solution:** API checks `jobs.status` before accepting application. Returns HTTP 409 with user-friendly messages: "no longer accepting applications" (closed) vs. "temporarily paused, check back soon" (paused). Job detail page also shows a banner warning before the Apply button.

### 6. Calendar Invite Without Email Reply
**Problem:** Spec notes candidate may accept Google Calendar invite without replying to email.
**Solution:** In production, we use Google Calendar push notifications (webhooks) to watch for attendee RSVP changes on tentative hold events. When status changes to `ACCEPTED`, we record it without waiting for an email reply. The .ics attachment also allows acceptance from any calendar client.

---

## Assumptions & Trade-offs

### 1. Fireflies API Mocked for Demo
**What:** Transcript retrieval uses mock data instead of hitting the real Fireflies API.
**Why:** Fireflies requires a real meeting to have occurred; can't demo with fake meeting IDs.
**Real implementation:** The GraphQL query, webhook handler, and bot scheduling code are all written and wired — just need a real API key and live meeting to activate. Set `FIREFLIES_API_KEY` and it will use the real API.

### 2. Google Calendar Mocked with Simulation
**What:** Calendar slot generation uses computed mock slots instead of real OAuth + Calendar API.
**Why:** Requires a real Google account with OAuth2 refresh token; can't include credentials in a demo repo.
**Real implementation:** `lib/calendar.ts` includes the full Google Calendar API flow in comments; `getRealCalendarSlots()` is ready to activate. Set `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and it switches automatically.

### 3. Candidate Research Uses Claude Reasoning, Not Live Web Search
**What:** LinkedIn/Twitter/GitHub summaries are generated by Claude reasoning over submitted profile data, not real-time scraping.
**Why:** Live scraping requires Playwright/Puppeteer + proxy infrastructure. Perplexity/Exa API calls need additional keys and add latency.
**Real implementation:** Use Exa.ai search API with queries like `"Jane Smith" site:linkedin.com`, pass results to Claude for synthesis. Or use Perplexity API for direct web-search-augmented responses.

### 4. Custom E-Signature vs. DocuSign
**What:** Built a canvas-based signature UI instead of integrating DocuSign or PandaDoc.
**Why:** Eliminates a ~$25/month dependency, keeps all data self-hosted, and is faster to demo end-to-end. For a real hiring system at scale, DocuSign provides better legal defensibility and audit trails.
**Trade-off:** Our solution captures signature PNG + IP + timestamp which is legally valid in most jurisdictions (similar to what services like Stripe use for Terms of Service acceptance).

### 5. Admin Auth Not Implemented
**What:** The `/admin` routes have no authentication.
**Why:** Scope: the assignment asks to evaluate AI pipeline design, not auth implementation. Adding NextAuth or Supabase Auth would add 2-3 hours of setup.
**Real implementation:** Add `middleware.ts` with Supabase session checking + redirect to `/admin/login`. All admin routes check for active session.

---

## What I'd Improve With More Time

1. **Real-time updates:** Add Supabase Realtime subscriptions to push pipeline updates to the admin dashboard without refresh
2. **Bias detection:** Add a Claude analysis step that flags potentially biased language in interview notes or screening rationales
3. **Interviewer scorecard:** Structured post-interview form that feeds into the offer decision alongside the AI summary
4. **Multi-round interviews:** Support multiple interview rounds per candidate with separate slots and transcripts
5. **SMS nudges:** Add Twilio SMS nudges alongside email (higher open rate for scheduling)
6. **Candidate portal:** Let candidates track their own application status via a secure link
7. **Analytics:** Time-to-hire, offer acceptance rate, AI score calibration dashboard
8. **Webhook reliability:** Add a job queue (Upstash QStash or Inngest) for reliable webhook processing with retries
