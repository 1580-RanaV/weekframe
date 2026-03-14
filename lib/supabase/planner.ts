import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceMembershipRole = "pm" | "engineer";
export type PlannerTaskStatus = "todo" | "in-progress" | "done";

type SupabaseLike = SupabaseClient;

export interface WorkspaceSummary {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceAccess {
  workspace: WorkspaceSummary | null;
  role: WorkspaceMembershipRole | null;
  error: "not-found" | "forbidden" | null;
}

export interface PlannerTaskRecord {
  id: string;
  title: string;
  content: string;
  labels: string[];
  status: PlannerTaskStatus;
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapWorkspaceRow(row: {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}): WorkspaceSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function fetchUserWorkspaces(
  supabase: SupabaseLike,
  userId: string,
) {
  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_memberships")
    .select("workspace_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  const workspaceIds = Array.from(
    new Set((memberships ?? []).map((membership) => membership.workspace_id)),
  );

  if (workspaceIds.length === 0) {
    return [];
  }

  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, name, created_at")
    .in("id", workspaceIds)
    .order("created_at", { ascending: true });

  if (workspaceError) throw workspaceError;

  return (workspaces ?? []).map(mapWorkspaceRow);
}

export async function fetchWorkspaceAccess(
  supabase: SupabaseLike,
  userId: string,
  slug: string,
): Promise<WorkspaceAccess> {
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, name, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (workspaceError) throw workspaceError;

  if (!workspace) {
    return { workspace: null, role: null, error: "not-found" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_memberships")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;

  if (!membership) {
    return { workspace: null, role: null, error: "forbidden" };
  }

  return {
    workspace: mapWorkspaceRow(workspace),
    role: membership.role as WorkspaceMembershipRole,
    error: null,
  };
}

export async function fetchPlannerTasks(
  supabase: SupabaseLike,
  workspaceId: string,
  engineerUserId: string,
) {
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(
      "id, title, description, labels, status, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("assignee_user_id", engineerUserId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (tasksError) throw tasksError;

  const { data: plans, error: plansError } = await supabase
    .from("week_plans")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("engineer_user_id", engineerUserId);

  if (plansError) throw plansError;

  const planIds = (plans ?? []).map((plan) => plan.id);
  const scheduleByTaskId = new Map<string, string | null>();

  if (planIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("week_plan_items")
      .select("task_id, planned_day, updated_at")
      .in("week_plan_id", planIds)
      .order("updated_at", { ascending: false });

    if (itemsError) throw itemsError;

    for (const item of items ?? []) {
      if (!scheduleByTaskId.has(item.task_id)) {
        scheduleByTaskId.set(item.task_id, item.planned_day);
      }
    }
  }

  return (tasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    content: task.description,
    labels: Array.isArray(task.labels)
      ? task.labels.filter((value): value is string => typeof value === "string")
      : [],
    status: task.status as PlannerTaskStatus,
    scheduledDate: scheduleByTaskId.get(task.id) ?? null,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  })) satisfies PlannerTaskRecord[];
}

async function ensureDraftPlan(
  supabase: SupabaseLike,
  workspaceId: string,
  engineerUserId: string,
  weekStart: string,
) {
  const { data: existingPlan, error: existingPlanError } = await supabase
    .from("week_plans")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("engineer_user_id", engineerUserId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (existingPlanError) throw existingPlanError;
  if (existingPlan) return existingPlan.id;

  const { data: createdPlan, error: createPlanError } = await supabase
    .from("week_plans")
    .insert({
      workspace_id: workspaceId,
      engineer_user_id: engineerUserId,
      week_start: weekStart,
      state: "draft",
    })
    .select("id")
    .single();

  if (createPlanError) throw createPlanError;
  return createdPlan.id;
}

export async function createPlannerTask(
  supabase: SupabaseLike,
  workspaceId: string,
  engineerUserId: string,
  title: string,
  scheduledDate: string | null,
) {
  const timestamp = new Date().toISOString();

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      title,
      description: "",
      labels: [],
      status: "todo",
      assignee_user_id: engineerUserId,
      source: "manual",
      created_by: engineerUserId,
      updated_at: timestamp,
    })
    .select("id, title, description, labels, status, created_at, updated_at")
    .single();

  if (taskError) throw taskError;

  if (scheduledDate) {
    await persistTaskSchedule(
      supabase,
      workspaceId,
      engineerUserId,
      task.id,
      scheduledDate,
    );
  }

  return {
    id: task.id,
    title: task.title,
    content: task.description,
    labels: Array.isArray(task.labels)
      ? task.labels.filter((value): value is string => typeof value === "string")
      : [],
    status: task.status as PlannerTaskStatus,
    scheduledDate,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  } satisfies PlannerTaskRecord;
}

export async function updatePlannerTask(
  supabase: SupabaseLike,
  task: PlannerTaskRecord,
) {
  const { error } = await supabase
    .from("tasks")
    .update({
      title: task.title,
      description: task.content,
      labels: task.labels,
      status: task.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id);

  if (error) throw error;
}

export async function deletePlannerTask(
  supabase: SupabaseLike,
  taskId: string,
) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function persistTaskSchedule(
  supabase: SupabaseLike,
  workspaceId: string,
  engineerUserId: string,
  taskId: string,
  plannedDay: string,
) {
  const [year, month, day] = plannedDay.split("-").map(Number);
  const targetDate = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  targetDate.setHours(0, 0, 0, 0);
  const dayOfWeek = targetDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  targetDate.setDate(targetDate.getDate() + mondayOffset);

  const weekStart = `${targetDate.getFullYear()}-${String(
    targetDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

  const { data: userPlans, error: plansError } = await supabase
    .from("week_plans")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("engineer_user_id", engineerUserId);

  if (plansError) throw plansError;

  const planId = await ensureDraftPlan(
    supabase,
    workspaceId,
    engineerUserId,
    weekStart,
  );

  const removablePlanIds = (userPlans ?? [])
    .map((plan) => plan.id)
    .filter((id) => id !== planId);

  if (removablePlanIds.length > 0) {
    const { error: removeError } = await supabase
      .from("week_plan_items")
      .delete()
      .eq("task_id", taskId)
      .in("week_plan_id", removablePlanIds);

    if (removeError) throw removeError;
  }

  const { error: upsertError } = await supabase
    .from("week_plan_items")
    .upsert(
      {
        week_plan_id: planId,
        task_id: taskId,
        planned_day: plannedDay,
        sort_order: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "week_plan_id,task_id" },
    );

  if (upsertError) throw upsertError;
}
