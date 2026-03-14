drop policy if exists "engineers_can_update_their_task_progress" on public.tasks;
drop policy if exists "engineers_can_manage_their_tasks" on public.tasks;

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
