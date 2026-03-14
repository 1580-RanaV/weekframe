-- Weekframe V1 schema blueprint
-- This schema is intentionally small and aimed at the PM -> engineer weekly
-- planning workflow.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1),
      'New user'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('pm', 'engineer')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  description text not null default '',
  labels text[] not null default '{}'::text[],
  status text not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  assignee_user_id uuid references public.profiles (id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'csv', 'jira', 'linear')),
  source_url text,
  external_ref text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index if not exists tasks_workspace_idx on public.tasks (workspace_id);
create index if not exists tasks_assignee_idx on public.tasks (assignee_user_id);
create index if not exists tasks_status_idx on public.tasks (status);

create table if not exists public.week_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  engineer_user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  state text not null default 'draft' check (state in ('draft', 'submitted', 'closed')),
  revision integer not null default 0,
  submitted_at timestamptz,
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, engineer_user_id, week_start)
);

create index if not exists week_plans_workspace_week_idx
  on public.week_plans (workspace_id, week_start);

create table if not exists public.week_plan_items (
  id uuid primary key default gen_random_uuid(),
  week_plan_id uuid not null references public.week_plans (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  planned_day date not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (week_plan_id, task_id)
);

create index if not exists week_plan_items_plan_idx
  on public.week_plan_items (week_plan_id, planned_day, sort_order);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.week_plans enable row level security;
alter table public.week_plan_items enable row level security;

-- Helper predicates should live in SQL functions later if the policy count grows.

create policy "profiles_self_read"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "workspace_members_can_read_workspaces"
  on public.workspaces
  for select
  using (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_members_can_read_memberships"
  on public.workspace_memberships
  for select
  using (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = workspace_memberships.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "pm_can_manage_tasks"
  on public.tasks
  for all
  using (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = tasks.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'pm'
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = tasks.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'pm'
    )
  );

create policy "engineers_can_read_their_tasks"
  on public.tasks
  for select
  using (
    assignee_user_id = auth.uid()
    and exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = tasks.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "engineers_can_manage_their_tasks"
  on public.tasks
  for all
  using (
    assignee_user_id = auth.uid()
    and exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = tasks.workspace_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    assignee_user_id = auth.uid()
    and created_by = auth.uid()
    and exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = tasks.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_members_can_read_week_plans"
  on public.week_plans
  for select
  using (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = week_plans.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "engineers_can_manage_own_week_plans"
  on public.week_plans
  for all
  using (
    engineer_user_id = auth.uid()
    and exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = week_plans.workspace_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    engineer_user_id = auth.uid()
    and exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = week_plans.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_members_can_read_week_plan_items"
  on public.week_plan_items
  for select
  using (
    exists (
      select 1
      from public.week_plans wp
      join public.workspace_memberships wm
        on wm.workspace_id = wp.workspace_id
      where wp.id = week_plan_items.week_plan_id
        and wm.user_id = auth.uid()
    )
  );

create policy "engineers_can_manage_own_week_plan_items"
  on public.week_plan_items
  for all
  using (
    exists (
      select 1
      from public.week_plans wp
      where wp.id = week_plan_items.week_plan_id
        and wp.engineer_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.week_plans wp
      where wp.id = week_plan_items.week_plan_id
        and wp.engineer_user_id = auth.uid()
    )
  );
