# Supabase Setup For Weekframe V1

## Environment Variables

The repo now reads these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

They are defined locally in `.env.local`, and `.env.example` is included for
reference.

## Dashboard Setup

### 1. Run the schema

Open Supabase SQL Editor and run:

- `docs/supabase-v1-schema.sql`

If you already ran an older version of the schema before the live planner sync,
also run:

- `docs/supabase-v1-policy-patch.sql`

That creates:

- profiles
- workspaces
- workspace_memberships
- tasks
- week_plans
- week_plan_items

It also enables RLS and adds starter policies.

### 2. Configure authentication

In Supabase Auth:

- enable Email provider
- use magic link for the fastest V1 setup

### 3. Set Site URL and Redirect URLs

For local development, add:

- `http://localhost:3000`
- `http://localhost:3000/auth/callback`

If you deploy later, add your production domain and callback URL too.

### 4. Create your first users

For V1, create at least:

- one PM account
- one engineer account

The schema now auto-creates a `profiles` row when a user signs up.

### 5. Seed the first workspace and memberships

Use SQL or Table Editor to insert:

- one workspace
- one PM membership
- one engineer membership

At minimum you need:

- a row in `workspaces`
- rows in `workspace_memberships`

## What The Repo Is Ready For

The repo now has:

- Supabase browser client
- Supabase server client
- session middleware
- auth callback route

Files:

- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`
- `middleware.ts`
- `app/auth/callback/route.ts`

## What Still Needs To Be Built

This setup now supports:

1. auth-backed sign-in
2. workspace lookup by slug
3. engineer planner task loading from Supabase
4. engineer task create, update, move, and delete mutations

Next implementation phase:

1. submit week plan mutation
2. PM import and review routes
3. weekly summary screen
