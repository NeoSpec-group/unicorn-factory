# Unicorn Factory

Turn your idea into a working MVP — overnight.

Unicorn Factory runs an autonomous AI pipeline that researches your market, evaluates your idea, and ships a proof-of-concept. The MVP demonstrates the full end-to-end 7-screen user flow using real Supabase authentication, real LLM calls for intake intelligence, and realistic mock data for pipeline outputs.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Auth & Database:** Supabase (Auth + Postgres + RLS)
- **Styling:** Tailwind CSS v4
- **AI:** Vercel AI SDK + Anthropic Claude Haiku
- **Deployment:** Vercel

---

## Prerequisites

Before running locally you need:

1. **Node.js 18+** — check with `node --version`
2. **A Supabase account** — free tier at [supabase.com](https://supabase.com)
3. **An Anthropic API key** — from [console.anthropic.com](https://console.anthropic.com)

---

## Setup

### Step 1 — Clone and install dependencies

```bash
git clone <your-repo-url> unicorn-factory
cd unicorn-factory
npm install
```

### Step 2 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project** and give it a name (e.g. `unicorn-factory`).
3. Wait for the project to provision (~1 minute).
4. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### Step 3 — Run the database schema

1. In your Supabase dashboard, go to **SQL Editor → New query**.
2. Paste and run the following SQL:

```sql
-- Table: email_leads
CREATE TABLE IF NOT EXISTS email_leads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;

-- Table: projects
CREATE TABLE IF NOT EXISTS projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status               TEXT NOT NULL DEFAULT 'idea_submitted'
                         CHECK (status IN (
                           'idea_submitted',
                           'questions_answered',
                           'research_running',
                           'research_complete',
                           'checkpoint_reviewed',
                           'build_running',
                           'build_complete',
                           'stopped'
                         )),
  idea_text            TEXT NOT NULL,
  clarifying_questions JSONB,
  outputs              JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Step 4 — Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com).
2. Create an account and generate an API key.
3. Copy the key — it starts with `sk-ant-api03-...`.

### Step 5 — Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
ANTHROPIC_MODEL=claude-haiku-4-5
```

**Security rules:**
- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` must NEVER have `NEXT_PUBLIC_` prefix — they would be exposed in the browser bundle.
- Never commit `.env.local` to version control.

### Step 6 — Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | No | Health check — always returns `{ status: "ok" }` |
| POST | `/api/leads` | No | Capture landing page email leads |
| POST | `/api/projects` | Yes | Submit idea — LLM constraint check; creates project on accept |
| GET | `/api/projects/[id]` | Yes | Fetch project state and outputs |
| GET | `/api/projects/[id]/questions` | Yes | Generate (or return cached) clarifying questions |
| POST | `/api/projects/[id]/submit-answers` | Yes | Save answers; advance to `questions_answered` |
| POST | `/api/projects/[id]/research` | Yes | Mock research pipeline — phase: start or complete |
| POST | `/api/projects/[id]/proceed` | Yes | User proceeds to build at checkpoint |
| POST | `/api/projects/[id]/stop` | Yes | User stops project at checkpoint |
| POST | `/api/projects/[id]/build` | Yes | Mock build pipeline — phase: start or complete |

---

## Project State Machine

```
(none) --> idea_submitted --> questions_answered --> research_running --> research_complete
                                                                               |           |
                                                                    checkpoint_reviewed   stopped (terminal)
                                                                               |
                                                                    build_running --> build_complete (terminal)
```

---

## Mock Data

All mock pipeline data lives in `lib/mock-data.ts`. Each mock constant is labelled with a `// MOCK:` comment describing what replaces it in production. The seeded example uses "a tool for freelancers to track invoices".

---

## Extending to Production

The MVP is designed for straightforward replacement of mock components.

### Replace the Research Pipeline

1. In `app/api/projects/[id]/research/route.ts`, replace the `MOCK_RESEARCH_OUTPUTS` import with a call to your real research agent service.
2. Poll or stream agent completion events to the client — the `phase: "start" | "complete"` pattern in the API route is already wired to accept this.
3. Remove the `// MOCK:` comment and the `MOCK_RESEARCH_OUTPUTS` export from `lib/mock-data.ts`.

### Replace the Build Pipeline

1. In `app/api/projects/[id]/build/route.ts`, replace `MOCK_BUILD_OUTPUTS` with real build agent deliverables.
2. Store deliverable URLs (Vercel, GitHub) in `projects.outputs.build`.
3. Remove the `// MOCK:` comment.

### Replace the Progress Steps

The `MOCK_RESEARCH_STEPS` and `MOCK_BUILD_STEPS` arrays in `lib/mock-data.ts` drive the animated progress screens. In production, stream real step events from your agent orchestration service and update step status via WebSocket or Server-Sent Events.

### Add Real Competitor Research

Replace `MOCK_COMPETITOR_MAP` in `lib/mock-data.ts` with calls to a competitor analysis API (e.g. Crunchbase, SimilarWeb).

### Upgrade Session Handling

The `lib/supabase/server.ts` `setAll` no-op means refresh tokens are not persisted from API routes. For long-running sessions, implement full cookie management using `@supabase/ssr`'s `setAll` callback with a `NextResponse`.

### Production Deployment

```bash
npm install -g vercel
vercel login
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## Development Notes

- No `src/` directory — files live at project root per Next.js convention used here.
- `@/*` path alias maps to project root — e.g. `import { callLLM } from '@/lib/ai/client'`.
- All TypeScript types are in `types/index.ts` — no `any` types in this codebase.
- All mock data is in `lib/mock-data.ts` — single source of truth for seeded data.
- Auth guard lives in `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`; the exported function is named `proxy`).
