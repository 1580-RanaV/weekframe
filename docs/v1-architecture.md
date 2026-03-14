# Weekframe V1 Architecture

## Product Definition

Weekframe V1 is a planning layer for software teams.

It does not replace Jira, Linear, or another task system.
It starts after assignment.

Core workflow:

1. A PM imports or creates tasks and assigns them to an engineer.
2. The engineer opens Weekframe and sees only their assigned work.
3. The engineer drags tasks into Monday-Friday and builds a realistic week.
4. The engineer submits the week plan.
5. The PM sees a read-only review of what the engineer committed to.
6. At the end of the week, Weekframe shows planned vs done vs slipped.

## Why This Fits The Current Codebase

The current app already has the right interaction model for the engineer side:

- a weekly planner
- drag and drop task cards
- task detail modal
- status updates
- labels and notes
- week statistics

What is missing is shared data and role-based workflow.

The current `app/_components/memory-space-app.tsx` is effectively a local-only
engineer planner. V1 should keep the planner UX, but move the data to Supabase
and split the app into PM and engineer surfaces.

## V1 Scope

Included:

- authentication
- shared workspace data
- PM task import / creation
- engineer week planner
- submit week plan
- PM read-only review screen
- end-of-week summary

Excluded:

- comments
- chat
- notifications
- Google Calendar sync
- Jira or Linear bidirectional sync
- advanced reporting
- fine-grained admin tools
- revision history beyond latest submitted plan

## User Roles

### PM

- creates or imports tasks
- assigns tasks to engineers
- reviews submitted weekly plans
- views end-of-week summaries

### Engineer

- sees tasks assigned to them
- drags tasks into weekdays
- updates task status
- adds notes and labels
- submits the week plan

## Product Surfaces

### 1. Engineer Planner

Route:

- `/[slug]`

Purpose:

- default landing view for engineers
- shows current week
- shows assigned tasks and planned tasks
- supports task detail editing
- allows submitting the week plan

Primary actions:

- drag task into a day
- reorder task within a day
- update status
- add notes and labels
- submit week plan

### 2. PM Import / Assignment

Route:

- `/[slug]/import`

Purpose:

- create tasks manually
- bulk import tasks from CSV
- assign tasks to engineers

Primary actions:

- create task
- paste or upload CSV
- assign engineer
- optionally include source URL or external reference

V1 import modes:

- manual task entry
- CSV upload

No external API sync in V1.

### 3. PM Review Screen

Route:

- `/[slug]/review`

Purpose:

- read-only view of engineers and their submitted week plans
- lets PM see committed work for the week

Primary information:

- engineer
- week plan state
- submitted timestamp
- planned work by weekday
- live task status
- counts: planned, done, left

### 4. End-of-Week Summary

Route:

- `/[slug]/summary/[weekStart]`

Purpose:

- compare submitted plan vs final state
- show outcome of the week

Primary metrics:

- planned
- completed
- in progress
- slipped
- completion rate

## Route Strategy

Keep the existing `[slug]` workspace route.

Recommended app structure:

```text
app/
  page.tsx
  [slug]/
    page.tsx
    review/page.tsx
    import/page.tsx
    summary/[weekStart]/page.tsx
```

### Route behavior

- engineer role opening `/[slug]` sees planner
- PM role opening `/[slug]` can also see planner, but primary navigation points to
  review and import
- review and import routes require PM membership

## Data Model

The Supabase schema for V1 should include:

- `profiles`
- `workspaces`
- `workspace_memberships`
- `tasks`
- `week_plans`
- `week_plan_items`

See `docs/supabase-v1-schema.sql` for the draft schema.

## Data Semantics

### Tasks

Tasks are shared workspace records.

Key fields:

- `title`
- `description`
- `status`
- `labels`
- `assignee_user_id`
- `source`
- `source_url`
- `external_ref`

### Week Plans

One engineer gets one plan per workspace per week.

`week_plans` stores:

- engineer
- week start date
- plan state
- submit timestamp
- revision

`week_plan_items` stores:

- task
- planned weekday
- sort order

## Submit Week Plan Semantics

V1 should keep this simple:

1. Engineer arranges tasks during draft mode.
2. Engineer clicks `Submit week plan`.
3. The plan becomes `submitted`.
4. PM review screen reads the submitted plan.
5. Engineer can still change task status after submission.
6. If the engineer wants to change day placement, they click `Edit plan`, which
   returns the plan to draft mode and increments `revision` on the next submit.

This avoids building full revision history while still allowing the PM to know
whether the plan changed.

## State And Data Flow

## Current State

Today:

- all state lives in one client component
- data is persisted in `localStorage`
- there is no auth
- there is no backend

## V1 State Shape

Move from local reducer state to server-backed data:

- auth session from Supabase
- workspace membership loaded on route entry
- planner data fetched for current week
- task updates written to Supabase
- plan submit action writes to `week_plans`

## Recommended Split

The current `memory-space-app.tsx` should be broken into smaller modules.

Suggested structure:

```text
app/_components/planner/
  planner-shell.tsx
  week-header.tsx
  week-board.tsx
  day-column.tsx
  task-card.tsx
  task-editor-modal.tsx
  submit-plan-bar.tsx
  stats-panel.tsx

app/_components/review/
  review-shell.tsx
  engineer-plan-card.tsx
  review-week-grid.tsx

app/_components/import/
  import-shell.tsx
  create-task-form.tsx
  csv-import-form.tsx
```

Supabase integration:

```text
lib/supabase/
  client.ts
  server.ts
  middleware.ts
  queries/
    auth.ts
    workspaces.ts
    tasks.ts
    week-plans.ts
```

## Rendering Strategy

Use server components for route entry and auth checks.

Use client components for:

- drag and drop planner
- task modal
- optimistic task status changes
- CSV input UI

Recommended route pattern:

- server route loads membership and initial week data
- client planner receives normalized data
- mutations go through Supabase client helpers

## Auth Strategy

Supabase auth is enough for V1.

Use:

- email magic link or email/password
- `profiles` table for display name
- `workspace_memberships` for role

No separate custom auth system is needed.

## Permissions Model

### Engineer can:

- read workspace they belong to
- read tasks assigned to them
- update status, notes, labels on their own assigned tasks
- create and update their own week plans
- submit their own week plans

### PM can:

- read everything in their workspace
- create and assign tasks
- read all week plans
- read summaries

### PM cannot in V1:

- directly modify an engineer's submitted plan from the review screen

That keeps the product aligned with "planning layer" rather than manager control.

## UI Decisions For V1

### Engineer view

Keep the current visual style:

- five weekday columns
- drag and drop cards
- compact task cards
- modal task editor

Add:

- `Assigned` strip or inbox for tasks not placed into the week yet
- `Submit week plan` action in header or footer
- `Plan submitted` badge with revision number

### PM review view

Must be intentionally read-only.

Recommended layout:

- filter by engineer
- week selector
- each engineer gets a row or card
- weekday columns show submitted tasks
- show status counts and submitted time

### Import view

Simple and operational:

- manual create task form
- CSV uploader
- assignment dropdown
- source / URL field

No need for heavy styling or deep management here.

## End-of-Week Summary Logic

Computed from the latest submitted plan for that week.

Definitions:

- `planned`: number of items in the submitted plan
- `done`: submitted tasks whose final status is `done`
- `in progress`: submitted tasks whose final status is `in-progress`
- `slipped`: submitted tasks not `done` by end of week
- `completion rate`: `done / planned`

This is enough for V1.

## Migration Plan From Current App

### Phase 1

Restructure the current app before wiring Supabase:

- split `memory-space-app.tsx`
- isolate planner UI from storage logic
- define shared task and plan types

### Phase 2

Introduce Supabase:

- add client and server helpers
- add auth
- replace `localStorage` hydration with server data

### Phase 3

Add role-based views:

- engineer planner
- PM import
- PM review

### Phase 4

Add submit and summary:

- submit week plan mutation
- end-of-week metrics
- review surface polish

## What We Should Build First

The first implementation step should not be the PM screen.

The first implementation step should be:

1. shared schema
2. auth and memberships
3. engineer planner backed by Supabase

Once that exists, PM import and PM review become straightforward.

## Recommended Resume Framing

Weekframe V1 should be described as:

"A planning layer for software teams that turns assigned work into engineer-owned
weekly commitments and gives PMs a clear read-only view of submitted weekly plans."

