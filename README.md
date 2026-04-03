# PhD Pathway Planner

This repo now contains two app paths:

- `react-app/`
  The primary app now. It includes the dashboard, checklist, import/export, recommenders, documents, advisor notes, dark mode, and best-effort link autofill.
- `index.html` + `app.js` + `styles.css`
  The older static version, kept as a fallback/reference.

## Run the primary React app

```bash
cd "/Users/alexisedge/Documents/New project"
npm run dev
```

This now proxies to the React/Vite app and serves it on port `4174`.

## Build the primary React app

```bash
cd "/Users/alexisedge/Documents/New project"
npm run build
```

## Deploy the React app

### Netlify

1. Push this repo to GitHub.
2. Create a new Netlify site from that repo.
3. Use the repo root as the project root.
4. Netlify will use `netlify.toml`, which already points to `react-app/`.

### Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Use the repo root as the project directory.
4. Vercel will use `vercel.json`, which already builds `react-app/` and serves `react-app/dist`.

Deployment config files are already included:

- `netlify.toml`
- `vercel.json`

## Run the React app directly

```bash
cd "/Users/alexisedge/Documents/New project/react-app"
npm install
npm run dev
```

## Run the old static version

```bash
cd "/Users/alexisedge/Documents/New project"
npm run static:dev
```

## What is now primary

The React/Vite app is now the default development and deployment target.
It includes:

- persisted planner state in local storage
- searchable/sortable program tracking
- editable program forms with source-link autofill
- checklist tracking
- document and recommender management
- advisor notes
- import/export
- field presets
- dark mode

## Deployment test

This line was added to verify Git-based Vercel redeploys from the `main` branch.

## Cloud save setup

The React app now includes a Supabase-based cloud save panel.

Add these environment variables to the `react-app` deployment environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then create this table in Supabase:

```sql
create table if not exists public.planner_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz default now()
);
```

Recommended row-level security:

```sql
alter table public.planner_states enable row level security;

create policy "Users can read their own planner state"
on public.planner_states
for select
using (auth.uid() = user_id);

create policy "Users can insert their own planner state"
on public.planner_states
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own planner state"
on public.planner_states
for update
using (auth.uid() = user_id);
```

For authentication, enable email magic links in Supabase Auth and set the site URL / redirect URL to your deployed Vercel domain.
