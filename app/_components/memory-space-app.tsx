"use client";

import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  type DragEvent,
  type FormEvent,
  startTransition,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createPlannerTask,
  deletePlannerTask,
  fetchPlannerTasks,
  fetchUserWorkspaces,
  fetchWorkspaceAccess,
  persistTaskSchedule,
  updatePlannerTask,
  type PlannerTaskRecord,
  type WorkspaceMembershipRole,
} from "@/lib/supabase/planner";

// ─── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  space: "memoryspace.space",
  folders: "memoryspace.folders",
  notes: "memoryspace.notes",
  labelPresets: "memoryspace.label-presets",
};

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SpaceIdentity {
  name: string;
  slug: string;
  createdAt: string;
}

type AppRole = WorkspaceMembershipRole;
type EntryKind = "task" | "note";
type TaskStatus = "todo" | "in-progress" | "done";
interface Note {
  id: string;
  kind: EntryKind;
  title: string;
  folder: string;
  labels: string[];
  content: string;
  status: TaskStatus;
  scheduledDate: string | null;
  postponedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UrlPreview {
  href: string;
  host: string;
  path: string;
  title: string;
  thumbnail: string | null;
  favicon: string;
  initials: string;
}

interface WorkspaceState {
  hydrated: boolean;
  space: SpaceIdentity | null;
  folders: string[];
  notes: Note[];
  activeFolder: string;
  selectedNoteId: string;
  lastSavedAt: string | null;
}

type WorkspaceAction =
  | {
      type: "hydrate";
      payload: {
        space: SpaceIdentity | null;
        folders: string[];
        notes: Note[];
        lastSavedAt: string | null;
      };
    }
  | {
      type: "commit-space";
      space: SpaceIdentity;
      savedAt: string;
      initialFolders?: string[];
      initialNotes?: Note[];
    }
  | { type: "set-active-folder"; folder: string }
  | { type: "select-note"; noteId: string }
  | { type: "create-folder"; folder: string }
  | { type: "delete-folder"; folder: string; fallbackFolder: string }
  | { type: "create-note"; note: Note }
  | {
      type: "update-note";
      noteId: string;
      patch: Partial<
        Pick<
          Note,
          | "title"
          | "content"
          | "folder"
          | "labels"
          | "status"
          | "scheduledDate"
          | "postponedAt"
        >
      >;
      updatedAt: string;
    }
  | { type: "delete-note"; noteId: string }
  | { type: "set-last-saved"; value: string };

// ─── Reducer ────────────────────────────────────────────────────────────────────

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "hydrate":
      const nextSelectedNoteId = action.payload.notes.some(
        (note) => note.id === state.selectedNoteId,
      )
        ? state.selectedNoteId
        : (action.payload.notes[0]?.id ?? "");
      return {
        ...state,
        hydrated: true,
        space: action.payload.space,
        folders: action.payload.folders,
        notes: action.payload.notes,
        activeFolder: action.payload.folders[0] ?? "",
        selectedNoteId: nextSelectedNoteId,
        lastSavedAt: action.payload.lastSavedAt,
      };
    case "commit-space": {
      const newFolders = action.initialFolders ?? state.folders;
      const newNotes = action.initialNotes ?? state.notes;
      return {
        ...state,
        space: action.space,
        lastSavedAt: action.savedAt,
        folders: newFolders,
        notes: newNotes,
        activeFolder: newFolders[0] ?? "",
        selectedNoteId: newNotes[0]?.id ?? "",
      };
    }
    case "set-active-folder":
      return { ...state, activeFolder: action.folder };
    case "select-note":
      return { ...state, selectedNoteId: action.noteId };
    case "create-folder": {
      const nextFolders = state.folders.some((f) => f === action.folder)
        ? state.folders
        : [...state.folders, action.folder];
      return { ...state, folders: nextFolders, activeFolder: action.folder };
    }
    case "delete-folder": {
      const prefix = action.folder + "/";
      const toRemove = new Set(
        state.folders.filter(
          (f) => f === action.folder || f.startsWith(prefix),
        ),
      );
      const remaining = state.folders.filter((f) => !toRemove.has(f));
      const fallback = action.fallbackFolder || remaining[0] || "";
      const selNote = state.notes.find((n) => n.id === state.selectedNoteId);
      return {
        ...state,
        folders: remaining,
        notes: state.notes.map((n) =>
          toRemove.has(n.folder) ? { ...n, folder: fallback } : n,
        ),
        activeFolder: toRemove.has(state.activeFolder)
          ? fallback
          : state.activeFolder,
        selectedNoteId:
          selNote && toRemove.has(selNote.folder) ? "" : state.selectedNoteId,
      };
    }
    case "create-note": {
      // Don't add "" (unfiled) to the folders list
      const nextFolders =
        action.note.folder !== "" &&
        !state.folders.some((f) => f === action.note.folder)
          ? [...state.folders, action.note.folder]
          : state.folders;
      return {
        ...state,
        folders: nextFolders,
        notes: [action.note, ...state.notes],
        selectedNoteId: action.note.id,
      };
    }
    case "update-note": {
      const nextFolders =
        action.patch.folder !== undefined &&
        action.patch.folder !== "" &&
        !state.folders.some((f) => f === action.patch.folder)
          ? [...state.folders, action.patch.folder]
          : state.folders;
      return {
        ...state,
        folders: nextFolders,
        notes: state.notes.map((n) =>
          n.id === action.noteId
            ? { ...n, ...action.patch, updatedAt: action.updatedAt }
            : n,
        ),
      };
    }
    case "delete-note": {
      const remaining = state.notes.filter((n) => n.id !== action.noteId);
      return {
        ...state,
        notes: remaining,
        selectedNoteId:
          state.selectedNoteId === action.noteId
            ? (remaining[0]?.id ?? "")
            : state.selectedNoteId,
      };
    }
    case "set-last-saved":
      return { ...state, lastSavedAt: action.value };
    default:
      return state;
  }
}

// ─── Data Helpers ────────────────────────────────────────────────────────────────

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

const STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "done"];
const DEFAULT_LABEL_PRESETS = ["PR review", "Bug", "Meeting"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  "in-progress": "In Progress",
  done: "Done",
};

const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  task: "Task",
  note: "Note",
};

const STATUS_STYLES: Record<
  TaskStatus,
  {
    icon: string;
    badge: string;
    column: string;
    lane: string;
    strip: string;
  }
> = {
  todo: {
    icon: "text-[var(--muted)]",
    badge:
      "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)]",
    column: "border-t-[var(--border)]",
    lane: "bg-[rgba(115,115,115,0.06)]",
    strip: "bg-[var(--border-strong)]",
  },
  "in-progress": {
    icon: "text-[#d8a300]",
    badge:
      "border-[rgba(216,163,0,0.28)] bg-[rgba(216,163,0,0.1)] text-[#b98100]",
    column: "border-t-[#d8a300]",
    lane: "bg-[rgba(216,163,0,0.12)]",
    strip: "bg-[#d8a300]",
  },
  done: {
    icon: "text-[#30b46c]",
    badge:
      "border-[rgba(48,180,108,0.28)] bg-[rgba(48,180,108,0.12)] text-[#258b53]",
    column: "border-t-[#30b46c]",
    lane: "bg-[rgba(48,180,108,0.14)]",
    strip: "bg-[#30b46c]",
  },
};

function getAlternateStatuses(status: TaskStatus) {
  return STATUS_ORDER.filter(
    (candidate): candidate is TaskStatus => candidate !== status,
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
    ),
  );
}

function readStoredJson(key: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parseLabelPresets(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return uniqueStrings(
    value.filter((entry): entry is string => typeof entry === "string"),
  );
}

function formatTimestamp(value: string, format: "short" | "long" = "short") {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown";
  if (format === "short") {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function titleDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function dayKeyFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromDayKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function addDays(value: Date, count: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + count);
  return next;
}

function startOfMonday(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  return next;
}

function getDefaultPlannerWeekStart(value: Date) {
  const monday = startOfMonday(value);
  const day = value.getDay();
  if (day === 6 || day === 0) {
    return addDays(monday, 7);
  }
  return monday;
}

function formatWeekRangeLabel(weekStartKey: string) {
  const start = dateFromDayKey(weekStartKey);
  const end = addDays(start, 4);
  const startMonth = new Intl.DateTimeFormat("en", {
    month: "long",
  }).format(start);
  const endMonth = new Intl.DateTimeFormat("en", {
    month: "long",
  }).format(end);

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}`;
  }

  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
}

function formatPlannerDayName(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
  }).format(dateFromDayKey(value));
}

function formatPlannerDayDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(dateFromDayKey(value));
}

function getPlannerTone(tasks: Note[]): TaskStatus {
  if (tasks.length === 0) return "todo";
  const doneCount = tasks.filter((task) => task.status === "done").length;
  if (doneCount === tasks.length) return "done";
  if (doneCount > 0 || tasks.some((task) => task.status === "in-progress")) {
    return "in-progress";
  }
  return "todo";
}

function getPlannerMessage({
  scheduledCount,
  completedCount,
  inProgressCount,
}: {
  scheduledCount: number;
  completedCount: number;
  inProgressCount: number;
}) {
  if (scheduledCount === 0) {
    return "Plan the week before it fills itself.";
  }

  const completionRate = completedCount / scheduledCount;
  if (completionRate === 1) {
    return "Week closed clean. Everything planned is done.";
  }
  if (completionRate >= 0.8) {
    return "Strong week. Keep the finish clean.";
  }
  if (completedCount > 0 || inProgressCount > 0) {
    return "Good progress. Keep the week moving forward.";
  }
  return "Start with one clear win and build momentum.";
}

function isDayInDisplayedWeek(dayKey: string | null, weekStartKey: string) {
  if (!dayKey) return false;
  const start = dateFromDayKey(weekStartKey).valueOf();
  const end = addDays(dateFromDayKey(weekStartKey), 4).valueOf();
  const target = dateFromDayKey(dayKey).valueOf();
  return target >= start && target <= end;
}

function isTimestampInDisplayedWeek(value: string | null, weekStartKey: string) {
  if (!value) return false;
  const target = new Date(value);
  if (Number.isNaN(target.valueOf())) return false;
  const start = dateFromDayKey(weekStartKey);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 4);
  end.setHours(23, 59, 59, 999);
  return target.valueOf() >= start.valueOf() && target.valueOf() <= end.valueOf();
}

function getNextPlannerDate(dayKey: string) {
  const next = addDays(dateFromDayKey(dayKey), 1);
  const day = next.getDay();
  if (day === 6) {
    return dayKeyFromDate(addDays(next, 2));
  }
  if (day === 0) {
    return dayKeyFromDate(addDays(next, 1));
  }
  return dayKeyFromDate(next);
}

function extractPreview(content: string, maxLength = 90) {
  const normalized = content
    .replace(/https?:\/\/[^\s)]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}…`;
}

function extractUrls(content: string) {
  const matches = content.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return uniqueStrings(matches.map((url) => url.replace(/[.,!?]+$/, "")));
}

function getYouTubeVideoId(parsed: URL) {
  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    if (parsed.pathname === "/watch") {
      return parsed.searchParams.get("v");
    }

    const [section, id] = parsed.pathname.split("/").filter(Boolean);
    if (section && id && ["embed", "shorts", "live"].includes(section)) {
      return id;
    }
  }

  return null;
}

function getUrlPreview(url: string): UrlPreview | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    const youtubeId = getYouTubeVideoId(parsed);
    const siteName = host.split(".")[0] || host;
    const initials = siteName.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "LK";
    return {
      href: parsed.toString(),
      host,
      path:
        youtubeId !== null
          ? "Video preview"
          : path === "/"
            ? "Open link"
            : path.slice(0, 64),
      title: youtubeId !== null ? "YouTube" : host,
      thumbnail:
        youtubeId !== null
          ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
          : null,
      favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(parsed.origin)}`,
      initials,
    };
  } catch {
    return null;
  }
}

function latestTimestamp(notes: Note[], fallback: string) {
  const values = notes
    .map((n) => new Date(n.updatedAt).valueOf())
    .filter((v) => !Number.isNaN(v));
  if (values.length === 0) return fallback;
  return new Date(Math.max(...values)).toISOString();
}

function plannerTaskToNote(task: PlannerTaskRecord): Note {
  return {
    id: task.id,
    kind: "task",
    title: task.title,
    folder: "",
    labels: task.labels,
    content: task.content,
    status: task.status,
    scheduledDate: task.scheduledDate,
    postponedAt: null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function exportMarkdown(
  space: SpaceIdentity,
  notes: Note[],
  filters: { folder: string; search: string },
) {
  const lines = [
    `# ${space.name}`,
    "",
    `Slug: /${space.slug}`,
    `Folder: ${filters.folder}`,
    `Search: ${filters.search || "None"}`,
    `Exported: ${formatTimestamp(new Date().toISOString(), "long")}`,
    "",
  ];
  notes.forEach((note) => {
    lines.push(`## ${note.title}`);
    lines.push("");
    lines.push(`- Type: ${ENTRY_KIND_LABELS[note.kind]}`);
    lines.push(`- Folder: ${note.folder || "Unfiled"}`);
    if (note.kind === "task") {
      lines.push(`- Status: ${STATUS_LABELS[note.status]}`);
      lines.push(`- Scheduled: ${note.scheduledDate ?? "Backlog"}`);
      if (note.postponedAt) {
        lines.push(`- Last postponed: ${formatTimestamp(note.postponedAt, "long")}`);
      }
    }
    if (note.labels.length > 0)
      lines.push(`- Labels: ${note.labels.join(", ")}`);
    lines.push(`- Created: ${formatTimestamp(note.createdAt, "long")}`);
    lines.push(`- Updated: ${formatTimestamp(note.updatedAt, "long")}`);
    lines.push("");
    lines.push(note.content);
    lines.push("");
  });
  return lines.join("\n");
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(blobUrl);
}

// ─── Icons ───────────────────────────────────────────────────────────────────────

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}

function IconExport({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M2 9v3h10V9M7 1v7M4.5 5.5L7 8l2.5-2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevron({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 3l3 3-3 3" />
    </svg>
  );
}

function IconDots({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor">
      <circle cx="3" cy="7" r="1.2" />
      <circle cx="7" cy="7" r="1.2" />
      <circle cx="11" cy="7" r="1.2" />
    </svg>
  );
}

function IconCalendar({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2.75" width="10" height="8.25" rx="1.5" />
      <path d="M4.5 1.75v2M9.5 1.75v2M2 5h10" />
    </svg>
  );
}

function IconMemoryspace({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="m16.1325 4.33451-2.5233-1.40664c-.4721-.26314-1.0678-.1036-1.3452.36025-.5301.88653-.995 1.16623-1.5715 1.51306l-.0109.00653c-.68512.41222-1.48439.89668-2.26786 2.20693-.78556 1.31373-.82234 2.23251-.84978 3.01976l-.00064.0183c-.02242.6445-.04051 1.1644-.56688 2.0447-.53011.8866-.99504 1.1663-1.57156 1.5131l-.01086.0065c-.68515.4122-1.48441.8967-2.26789 2.207-.13881.2321-.17767.5106-.10769.7719.06998.2612.24281.483.47907.6147l2.62175 1.4615c.14127-.4135.30621-.7369.42823-.941.78347-1.3102 1.58276-1.7947 2.26791-2.2069l.01085-.0066c.57652-.3468 1.04146-.6265 1.57155-1.513.5264-.8803.5445-1.4003.5669-2.0448l.0006-.0183c.0275-.7872.0643-1.706.8498-3.01973.7835-1.31024 1.5828-1.79471 2.2679-2.20692l.0109-.00653c.5738-.34523 1.0371-.62397 1.5642-1.50087.1235-.22119.2956-.5451.4544-.87294ZM7.93136 19.6711l2.42894 1.354c.4721.2632 1.0678.1037 1.3452-.3602.5301-.8865.995-1.1662 1.5715-1.513l.0109-.0066c.6852-.4122 1.4844-.8967 2.2679-2.2069.7855-1.3137.8223-2.2325.8498-3.0198l.0006-.0183c.0224-.6444.0405-1.1644.5669-2.0447.5301-.8865.995-1.1662 1.5715-1.5131l.0109-.0065c.6852-.41221 1.4844-.89667 2.2679-2.20692.1388-.23214.1777-.51061.1077-.77188-.07-.26128-.2428-.48306-.479-.61477L17.882 5.30974c-.1678.34035-.34.6625-.4657.88717-.0047.00832-.0095.01658-.0143.02476-.7835 1.31025-1.5828 1.79471-2.2679 2.20693l-.0109.00653c-.5765.34683-1.0415.62653-1.5716 1.51306-.5263.88031-.5444 1.40031-.5668 2.04471l-.0007.0183c-.0274.7873-.0642 1.7061-.8498 3.0198-.7834 1.3102-1.5827 1.7947-2.26785 2.2069l-.01085.0065c-.57651.3469-1.04144.6266-1.57154 1.5131-.10167.17-.25746.4945-.3527.9136Z"
      />
    </svg>
  );
}

function IconSettings({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.75v2.1M10 15.15v2.1M2.75 10h2.1M15.15 10h2.1M4.88 4.88l1.48 1.48M13.64 13.64l1.48 1.48M4.88 15.12l1.48-1.48M13.64 6.36l1.48-1.48" />
      <circle cx="10" cy="10" r="6.1" opacity="0.35" />
    </svg>
  );
}

function IconX({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}

function LinkPreviewCard({
  preview,
  compact = false,
  className = "",
}: {
  preview: UrlPreview;
  compact?: boolean;
  className?: string;
}) {
  const mediaSize = compact ? "h-[56px] w-[76px]" : "h-[68px] w-[92px]";

  return (
    <a
      href={preview.href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`control-surface flex min-w-0 overflow-hidden rounded-sm ${className}`}
    >
      <div
        className={`relative shrink-0 overflow-hidden border-r border-[var(--border)] bg-[linear-gradient(135deg,var(--accent-soft),transparent_78%)] ${mediaSize}`}
      >
        <div
          className={`absolute inset-0 bg-[linear-gradient(135deg,var(--hover),transparent_70%)] ${
            preview.thumbnail ? "animate-pulse" : ""
          }`}
        />
        {preview.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.thumbnail}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--panel)] text-[11px] font-semibold text-[var(--text)]">
            {preview.initials}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1 px-3 py-2">
        <p className="truncate text-[13px] font-medium text-[var(--text)]">
          {preview.title}
        </p>
        <p
          className={`mt-1 text-[13px] text-[var(--muted)] ${compact ? "line-clamp-1" : "line-clamp-2"} break-words`}
        >
          {preview.path}
        </p>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.favicon}
            alt=""
            loading="lazy"
            className="h-3.5 w-3.5 shrink-0 rounded-sm"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="truncate">{preview.host}</span>
        </div>
      </div>
    </a>
  );
}

function AuthScreen({
  email,
  password,
  error,
  pending,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  error: string;
  pending: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <form
        onSubmit={onSubmit}
        className="fade-in app-shell w-full max-w-[420px] rounded-sm p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--accent)]">
            <IconMemoryspace size={22} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[var(--text)]">
              Weekframe
            </p>
            <p className="text-[13px] text-[var(--muted)]">
              Sign in to your weekly planner
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="control-surface h-11 w-full rounded-sm px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="control-surface h-11 w-full rounded-sm px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-[var(--danger-text)]">{error}</p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--muted)]">
            Use the PM or engineer account created in Supabase Auth.
          </p>
          <button
            type="submit"
            disabled={pending || !email.trim() || !password}
            className="inline-flex h-9 min-w-[108px] items-center justify-center rounded-sm bg-[var(--accent)] px-4 text-[13px] font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Simple Screen ────────────────────────────────────────────────────────────────

function SimpleScreen({
  label,
  title,
  body,
  action,
}: {
  label: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[380px] text-center">
        <p className="text-[13px] font-medium text-[var(--muted)] uppercase tracking-[0.08em]">
          {label}
        </p>
        <h1 className="mt-3 text-[13px] font-semibold text-[var(--text)] leading-snug">
          {title}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--muted)] leading-relaxed">
          {body}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────────

export default function MemorySpaceApp({
  routeSlug,
}: {
  routeSlug?: string;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const pendingTaskSavesRef = useRef<Record<string, number>>({});

  const [workspaceState, dispatchWorkspace] = useReducer(workspaceReducer, {
    hydrated: false,
    space: null,
    folders: [],
    notes: [],
    activeFolder: "",
    selectedNoteId: "",
    lastSavedAt: null,
  });

  const [authReady, setAuthReady] = useState(false);
  const [viewer, setViewer] = useState<User | null>(null);
  const [viewerRole, setViewerRole] = useState<AppRole | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [noteMenu, setNoteMenu] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("memoryspace.theme") === "dark"
        ? "dark"
        : "light";
    }
    return "light";
  });
  const [labelPresets, setLabelPresets] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_LABEL_PRESETS;
    return (
      parseLabelPresets(readStoredJson(STORAGE_KEYS.labelPresets)) ??
      DEFAULT_LABEL_PRESETS
    );
  });
  const [presetLabelDraft, setPresetLabelDraft] = useState("");
  const [plannerWeekStart, setPlannerWeekStart] = useState(() =>
    dayKeyFromDate(getDefaultPlannerWeekStart(new Date())),
  );
  const [plannerWeekDirection, setPlannerWeekDirection] = useState<
    "prev" | "next" | null
  >(null);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [taskEditorMode, setTaskEditorMode] = useState<"create" | "edit">(
    "edit",
  );
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const {
    space,
    notes,
    selectedNoteId,
    lastSavedAt,
  } = workspaceState;
  const notesRef = useRef(notes);

  function resetSignedOutState() {
    setWorkspaceLoading(false);
    setWorkspaceError("");
    setSaveError("");
    setWorkspaceId(null);
    setViewerRole(null);
    setTaskEditorOpen(false);
    dispatchWorkspace({
      type: "hydrate",
      payload: { space: null, folders: [], notes: [], lastSavedAt: null },
    });
  }

  // ─── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setAuthError(error.message);
      }
      if (!data.user) {
        resetSignedOutState();
      }
      setViewer(data.user ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        resetSignedOutState();
      }
      setViewer(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      Object.values(pendingTaskSavesRef.current).forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
    };
  }, [supabase]);

  useEffect(() => {
    if (!authReady || !viewer) return;

    let cancelled = false;
    const viewerId = viewer.id;

    async function loadWorkspaceData() {
      setWorkspaceLoading(true);
      setWorkspaceError("");
      setSaveError("");
        setAuthError("");

      try {
        if (!routeSlug) {
          const workspaces = await fetchUserWorkspaces(supabase, viewerId);
          if (cancelled) return;

          if (workspaces.length === 0) {
            setWorkspaceId(null);
            setViewerRole(null);
            setWorkspaceLoading(false);
            setWorkspaceError(
              "No workspace access yet. Ask a PM to add you to a workspace.",
            );
            return;
          }

          startTransition(() => router.replace(`/${workspaces[0].slug}`));
          return;
        }

        const access = await fetchWorkspaceAccess(supabase, viewerId, routeSlug);
        if (cancelled) return;

        if (access.error === "not-found") {
          setWorkspaceId(null);
          setViewerRole(null);
          setWorkspaceLoading(false);
          setWorkspaceError(`/${routeSlug} does not exist in this project.`);
          dispatchWorkspace({
            type: "hydrate",
            payload: { space: null, folders: [], notes: [], lastSavedAt: null },
          });
          return;
        }

        if (access.error === "forbidden" || !access.workspace || !access.role) {
          setWorkspaceId(null);
          setViewerRole(null);
          setWorkspaceLoading(false);
          setWorkspaceError(`You do not have access to /${routeSlug}.`);
          dispatchWorkspace({
            type: "hydrate",
            payload: { space: null, folders: [], notes: [], lastSavedAt: null },
          });
          return;
        }

        const nextSpace: SpaceIdentity = {
          name: access.workspace.name,
          slug: access.workspace.slug,
          createdAt: access.workspace.createdAt,
        };

        setWorkspaceId(access.workspace.id);
        setViewerRole(access.role);

        if (access.role === "pm") {
          dispatchWorkspace({
            type: "hydrate",
            payload: {
              space: nextSpace,
              folders: [],
              notes: [],
              lastSavedAt: nextSpace.createdAt,
            },
          });
          setWorkspaceLoading(false);
          return;
        }

        const plannerTasks = await fetchPlannerTasks(
          supabase,
          access.workspace.id,
          viewerId,
        );

        if (cancelled) return;

        const nextNotes = plannerTasks.map(plannerTaskToNote);
        dispatchWorkspace({
          type: "hydrate",
          payload: {
            space: nextSpace,
            folders: [],
            notes: nextNotes,
            lastSavedAt: latestTimestamp(nextNotes, nextSpace.createdAt),
          },
        });
        setWorkspaceLoading(false);
      } catch (error) {
        if (cancelled) return;
        setWorkspaceId(null);
        setViewerRole(null);
        setWorkspaceLoading(false);
        setWorkspaceError(
          error instanceof Error
            ? error.message
            : "Could not load the workspace from Supabase.",
        );
      }
    }

    loadWorkspaceData();

    return () => {
      cancelled = true;
    };
  }, [authReady, viewer, routeSlug, router, supabase]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = space ? `${space.name} — Weekframe` : "Weekframe";
  }, [space]);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("memoryspace.theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEYS.labelPresets,
      JSON.stringify(labelPresets),
    );
  }, [labelPresets]);

  useEffect(() => {
    if (!plannerWeekDirection) return;
    const id = window.setTimeout(() => setPlannerWeekDirection(null), 220);
    return () => window.clearTimeout(id);
  }, [plannerWeekDirection]);

  useEffect(() => {
    if (!noteMenu || typeof document === "undefined") return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-task-menu-interactive]")) return;
      setNoteMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [noteMenu]);

  // ─── Computed values ──────────────────────────────────────────────────────────

  const allTasks = [...notes]
    .filter((entry) => entry.kind === "task")
    .sort(
      (a, b) =>
        new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf(),
    );
  const todayKey = dayKeyFromDate(new Date());
  const defaultPlannerWeekStartKey = dayKeyFromDate(
    getDefaultPlannerWeekStart(new Date()),
  );
  const defaultTaskDay =
    plannerWeekStart === defaultPlannerWeekStartKey
      ? isDayInDisplayedWeek(todayKey, plannerWeekStart)
        ? todayKey
        : plannerWeekStart
      : null;
  const plannerStartDate = dateFromDayKey(plannerWeekStart);
  const plannerDays = Array.from({ length: 5 }, (_, index) => {
    const date = addDays(plannerStartDate, index);
    const key = dayKeyFromDate(date);
    const tasks = allTasks.filter(
      (task) =>
        task.scheduledDate === key ||
        (task.scheduledDate === null && defaultTaskDay === key),
    );
    return {
      key,
      name: formatPlannerDayName(key),
      dateLabel: formatPlannerDayDate(key),
      tasks,
      tone: getPlannerTone(tasks),
    };
  });
  const plannerDayKeys = plannerDays.map((day) => day.key);
  const weeklyTasks = allTasks.filter(
    (task) =>
      task.scheduledDate === null
        ? defaultTaskDay !== null
        : plannerDayKeys.includes(task.scheduledDate),
  );
  const scheduledOutsideWeekCount = allTasks.filter(
    (task) => task.scheduledDate !== null && !plannerDayKeys.includes(task.scheduledDate),
  ).length;
  const completedWeekCount = weeklyTasks.filter(
    (task) => task.status === "done",
  ).length;
  const inProgressWeekCount = weeklyTasks.filter(
    (task) => task.status === "in-progress",
  ).length;
  const leftWeekCount = weeklyTasks.filter(
    (task) => task.status !== "done",
  ).length;
  const tasksAddedThisWeekCount = allTasks.filter((task) =>
    isTimestampInDisplayedWeek(task.createdAt, plannerWeekStart),
  ).length;
  const tasksPostponedThisWeekCount = allTasks.filter((task) =>
    isTimestampInDisplayedWeek(task.postponedAt, plannerWeekStart),
  ).length;
  const weekProgressPercent =
    weeklyTasks.length === 0
      ? 0
      : Math.round((completedWeekCount / weeklyTasks.length) * 100);
  const plannerMessage = getPlannerMessage({
    scheduledCount: weeklyTasks.length,
    completedCount: completedWeekCount,
    inProgressCount: inProgressWeekCount,
  });
  const selectedTask =
    allTasks.find((entry) => entry.id === selectedNoteId) ?? null;
  const selectedTaskLinks = selectedTask
    ? extractUrls(selectedTask.content)
        .map(getUrlPreview)
        .filter((preview): preview is UrlPreview => preview !== null)
    : [];
  const selectedTaskLabelOptions = selectedTask
    ? uniqueStrings([...labelPresets, ...selectedTask.labels])
    : labelPresets;
  const canEditPlanner =
    viewerRole === "engineer" && viewer !== null && workspaceId !== null;

  const displayName = space?.name ?? "Weekframe";
  const displaySlug = space?.slug || routeSlug || "your-space";
  const plannerScheduleOptions = plannerDays.map((day) => ({
    value: day.key,
    label: `${day.name} · ${day.dateLabel}`,
  }));
  const selectedTaskScheduleOptions =
    selectedTask?.scheduledDate &&
    !plannerDayKeys.includes(selectedTask.scheduledDate)
      ? [
          {
            value: selectedTask.scheduledDate,
            label: `${formatPlannerDayName(selectedTask.scheduledDate)} · ${formatPlannerDayDate(selectedTask.scheduledDate)}`,
          },
          ...plannerScheduleOptions,
        ]
      : plannerScheduleOptions;
  // ─── Handlers ─────────────────────────────────────────────────────────────────

  async function handleAuthSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthPending(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setAuthError(error.message);
    }

    setAuthPending(false);
  }

  async function handleSignOut() {
    Object.values(pendingTaskSavesRef.current).forEach((timeoutId) =>
      window.clearTimeout(timeoutId),
    );
    pendingTaskSavesRef.current = {};
    await supabase.auth.signOut();
    setSettingsOpen(false);
    setTaskEditorOpen(false);
    startTransition(() => router.replace("/"));
  }

  function openTaskEditor(noteId: string, mode: "create" | "edit" = "edit") {
    dispatchWorkspace({
      type: "select-note",
      noteId,
    });
    setTaskEditorMode(mode);
    setTaskEditorOpen(true);
    setNoteMenu(null);
  }

  function closeTaskEditor() {
    setTaskEditorOpen(false);
    setTaskEditorMode("edit");
  }

  async function flushTaskSave(noteId: string) {
    if (!canEditPlanner) return;
    const note = notesRef.current.find((entry) => entry.id === noteId);
    if (!note || note.kind !== "task") return;

    try {
      await updatePlannerTask(supabase, {
        id: note.id,
        title: note.title,
        content: note.content,
        labels: note.labels,
        status: note.status,
        scheduledDate: note.scheduledDate,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });
      dispatchWorkspace({
        type: "set-last-saved",
        value: new Date().toISOString(),
      });
      setSaveError("");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save task changes.",
      );
    }
  }

  function queueTaskSave(noteId: string) {
    const existingTimeout = pendingTaskSavesRef.current[noteId];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    pendingTaskSavesRef.current[noteId] = window.setTimeout(() => {
      delete pendingTaskSavesRef.current[noteId];
      void flushTaskSave(noteId);
    }, 260);
  }

  async function persistTaskMove(noteId: string, scheduledDate: string) {
    if (!canEditPlanner || !workspaceId || !viewer) return;

    try {
      await persistTaskSchedule(
        supabase,
        workspaceId,
        viewer.id,
        noteId,
        scheduledDate,
      );
      dispatchWorkspace({
        type: "set-last-saved",
        value: new Date().toISOString(),
      });
      setSaveError("");
      void flushTaskSave(noteId);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not move the task.",
      );
    }
  }

  async function handleCreateTask(
    scheduledDate: string = defaultTaskDay ?? plannerWeekStart,
  ) {
    if (!canEditPlanner || !workspaceId || !viewer) return;
    const timestamp = new Date().toISOString();

    try {
      const createdTask = await createPlannerTask(
        supabase,
        workspaceId,
        viewer.id,
        `Task — ${titleDate(timestamp)}`,
        scheduledDate,
      );
      const nextNote = plannerTaskToNote(createdTask);
      dispatchWorkspace({ type: "create-note", note: nextNote });
      dispatchWorkspace({
        type: "set-last-saved",
        value: new Date().toISOString(),
      });
      setSaveError("");
      openTaskEditor(nextNote.id, "create");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not create the task.",
      );
    }
  }

  function updateNoteById(
    noteId: string,
    patch: Partial<
      Pick<
        Note,
        | "title"
        | "content"
        | "folder"
        | "labels"
        | "status"
        | "scheduledDate"
        | "postponedAt"
      >
    >,
    options?: {
      immediate?: boolean;
      skipRemote?: boolean;
    },
  ) {
    const updatedAt = new Date().toISOString();
    dispatchWorkspace({
      type: "update-note",
      noteId,
      patch,
      updatedAt,
    });

    if (!canEditPlanner || options?.skipRemote) return;

    if (patch.scheduledDate !== undefined && patch.scheduledDate !== null) {
      void persistTaskMove(noteId, patch.scheduledDate);
      return;
    }

    if (options?.immediate) {
      void flushTaskSave(noteId);
      return;
    }

    queueTaskSave(noteId);
  }

  function setNoteStatus(note: Note, status: TaskStatus) {
    if (note.kind !== "task" || note.status === status) return;
    updateNoteById(note.id, { status }, { immediate: true });
  }

  function addTaskLabel(note: Note, label: string) {
    const trimmed = label.trim().replace(/,/g, "");
    if (!trimmed || note.labels.includes(trimmed)) return;
    updateNoteById(note.id, {
      labels: [...note.labels, trimmed],
    });
  }

  function removeTaskLabel(note: Note, label: string) {
    updateNoteById(note.id, {
      labels: note.labels.filter((entry) => entry !== label),
    });
  }

  function toggleTaskLabel(note: Note, label: string) {
    if (note.labels.includes(label)) {
      removeTaskLabel(note, label);
      return;
    }
    addTaskLabel(note, label);
  }

  function addLabelPreset(value: string) {
    const trimmed = value.trim().replace(/,/g, "");
    if (!trimmed) return;
    setLabelPresets((current) => uniqueStrings([...current, trimmed]));
    setPresetLabelDraft("");
  }

  function removeLabelPreset(label: string) {
    setLabelPresets((current) => current.filter((entry) => entry !== label));
  }

  function moveTaskToDate(
    note: Note,
    scheduledDate: string,
    options?: { markPostponed?: boolean },
  ) {
    if (note.kind !== "task") return;
    updateNoteById(note.id, {
      scheduledDate,
      postponedAt: options?.markPostponed ? new Date().toISOString() : note.postponedAt,
    });
  }

  function moveTaskToNextRenderedDay(note: Note, scheduledDate: string | null) {
    if (!scheduledDate) return;
    moveTaskToDate(note, getNextPlannerDate(scheduledDate), {
      markPostponed: true,
    });
  }

  function requestTaskDeletion(note: Note) {
    setNoteMenu(null);
    setDeleteConfirmTask({
      id: note.id,
      title: note.title || "Untitled task",
    });
  }

  async function confirmTaskDeletion() {
    if (!deleteConfirmTask) return;

    try {
      await deletePlannerTask(supabase, deleteConfirmTask.id);
      dispatchWorkspace({
        type: "delete-note",
        noteId: deleteConfirmTask.id,
      });
      dispatchWorkspace({
        type: "set-last-saved",
        value: new Date().toISOString(),
      });
      if (selectedTask?.id === deleteConfirmTask.id) {
        closeTaskEditor();
      }
      setDeleteConfirmTask(null);
      setSaveError("");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not delete the task.",
      );
    }
  }

  function clearTaskDragState() {
    setDraggedTaskId(null);
    setDragOverDay(null);
  }

  function handleTaskDragEnd() {
    clearTaskDragState();
  }

  function handlePlannerDayDragOver(
    event: DragEvent<HTMLElement>,
    dayKey: string,
  ) {
    if (!draggedTaskId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverDay !== dayKey) {
      setDragOverDay(dayKey);
    }
  }

  function handlePlannerDayDragLeave(
    event: DragEvent<HTMLElement>,
    dayKey: string,
  ) {
    if (dragOverDay !== dayKey) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setDragOverDay((current) => (current === dayKey ? null : current));
  }

  function handlePlannerDayDrop(dayKey: string) {
    if (!draggedTaskId) return;
    const draggedTask = allTasks.find((task) => task.id === draggedTaskId);
    if (draggedTask && draggedTask.scheduledDate !== dayKey) {
      moveTaskToDate(draggedTask, dayKey);
    }
    clearTaskDragState();
  }

  function shiftPlannerWeek(direction: "prev" | "next") {
    setPlannerWeekDirection(direction);
    setPlannerWeekStart((current) =>
      dayKeyFromDate(
        addDays(dateFromDayKey(current), direction === "next" ? 7 : -7),
      ),
    );
  }

  function handleExport() {
    if (!space || weeklyTasks.length === 0) return;
    const content = exportMarkdown(space, weeklyTasks, {
      folder: formatWeekRangeLabel(plannerWeekStart),
      search: "Weekly planner",
    });
    downloadMarkdown(
      `${space.slug}-${slugify(formatWeekRangeLabel(plannerWeekStart))}-week.md`,
      content,
    );
  }

  function handleExportAll() {
    if (!space || notes.length === 0) return;
    const content = exportMarkdown(space, notes, {
      folder: "All folders",
      search: "",
    });
    downloadMarkdown(`${space.slug}-all-items.md`, content);
    setSettingsOpen(false);
  }

  function handleClearLocalPreferences() {
    if (
      !window.confirm(
        "This clears local theme and label preset preferences from this browser. Remote workspace data stays untouched.",
      )
    )
      return;
    window.localStorage.removeItem(STORAGE_KEYS.labelPresets);
    window.localStorage.removeItem("memoryspace.theme");
    window.location.reload();
  }

  function renderTaskCard(
    note: Note,
    options?: {
      showScheduledDate?: boolean;
      fallbackScheduledDate?: string;
    },
  ) {
    const linkPreview = extractUrls(note.content)
      .map(getUrlPreview)
      .find((preview): preview is UrlPreview => preview !== null);
    const contentPreview = extractPreview(note.content, 120);
    const effectiveScheduledDate =
      note.scheduledDate ?? options?.fallbackScheduledDate ?? null;
    const scheduleLabel =
      options?.showScheduledDate && effectiveScheduledDate
        ? `${formatPlannerDayName(effectiveScheduledDate)} ${formatPlannerDayDate(effectiveScheduledDate)}`
        : null;
    const quickStatusOptions = getAlternateStatuses(note.status);

    return (
      <div
        key={note.id}
        role="button"
        tabIndex={0}
        draggable={canEditPlanner}
        onClick={() => openTaskEditor(note.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            openTaskEditor(note.id);
          }
        }}
        onDragStart={(event) => {
          if (!canEditPlanner || note.kind !== "task") return;
          setDraggedTaskId(note.id);
          setDragOverDay(effectiveScheduledDate ?? defaultTaskDay);
          setNoteMenu(null);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", note.id);
        }}
        onDragEnd={handleTaskDragEnd}
        aria-grabbed={draggedTaskId === note.id}
        className={`group elevated-surface relative overflow-hidden rounded-sm border pl-[max(2.75rem,12%)] pr-3 py-2.5 text-left outline-none transition-[opacity,border-color,background-color,box-shadow] ${
          canEditPlanner ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        } ${
          taskEditorOpen && selectedTask?.id === note.id
            ? "selected-task-card"
            : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--border-strong)]"
        } ${draggedTaskId === note.id ? "opacity-60" : ""} ${
          noteMenu === note.id ? "z-20" : ""
        }`}
      >
        <div
          className={`absolute inset-0 transition-opacity ${
            draggedTaskId === note.id ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[var(--hover)]" />
          <div className="absolute inset-y-0 left-0 w-[10%] min-w-[28px] max-w-[36px] bg-transparent" />
        </div>
        <div className="absolute inset-y-0 left-0 w-[10%] min-w-[28px] max-w-[36px] overflow-hidden rounded-l-sm">
          <div
            aria-hidden="true"
            className={`absolute inset-0 transition-opacity duration-200 group-hover:opacity-0 ${STATUS_STYLES[note.status].lane}`}
          >
            <span
              className={`pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-sm ${STATUS_STYLES[note.status].strip}`}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 flex -translate-x-[2px] flex-col opacity-0 transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
            {quickStatusOptions.map((status, index) => (
              <button
                key={status}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNoteStatus(note, status);
                }}
                title={STATUS_LABELS[status]}
                aria-label={`Move ${note.title || "task"} to ${STATUS_LABELS[status]}`}
                className={`relative flex-1 transition-[filter,transform] duration-200 hover:brightness-[0.98] ${
                  index === 0 ? "rounded-tl-sm" : "rounded-bl-sm"
                } ${STATUS_STYLES[status].lane}`}
              >
                <span
                  className={`pointer-events-none absolute inset-y-0 left-0 w-[3px] ${
                    index === 0 ? "rounded-tl-sm" : "rounded-bl-sm"
                  } ${STATUS_STYLES[status].strip}`}
                />
              </button>
            ))}
          </div>
        </div>
        <div
          className={`relative z-[1] flex items-start justify-between gap-2 ${
            draggedTaskId === note.id ? "pointer-events-none" : ""
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-semibold leading-[1.4] text-[var(--text)]">
              {note.title || "Untitled task"}
            </p>
            {(scheduleLabel || note.labels.length > 0) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {scheduleLabel && (
                  <span className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-[13px] text-[var(--muted)]">
                    {scheduleLabel}
                  </span>
                )}
                {note.labels.slice(0, 2).map((label) => (
                  <span
                    key={label}
                    className="rounded-sm border border-[var(--border)] px-2 py-0.5 text-[13px] text-[var(--muted)]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
            {contentPreview ? (
              <p className="mt-1.5 line-clamp-2 break-words text-[13px] leading-[1.5] text-[var(--muted)]">
                {contentPreview}
              </p>
            ) : !linkPreview ? (
              <p className="mt-1.5 line-clamp-2 break-words text-[13px] leading-[1.5] text-[var(--muted)]">
                Add details, links, or next steps.
              </p>
            ) : null}
            {linkPreview && (
              <LinkPreviewCard
                preview={linkPreview}
                compact
                className="mt-2"
              />
            )}
            <p className="mt-2 text-[13px] text-[var(--muted)]">
              Updated {formatTimestamp(note.updatedAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {effectiveScheduledDate && (
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  moveTaskToNextRenderedDay(note, effectiveScheduledDate);
                }}
                aria-label={`Move ${note.title || "task"} to next workday`}
                title="Postpone to next workday"
              >
                <span className="inline-flex">
                  <IconChevron size={13} />
                </span>
              </button>
            )}
            <button
              type="button"
              data-task-menu-interactive
              className={`inline-flex h-8 w-8 items-center justify-center rounded-sm text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] ${
                noteMenu === note.id
                  ? "bg-[var(--hover)] text-[var(--text)]"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setNoteMenu(noteMenu === note.id ? null : note.id);
              }}
            >
              <IconDots size={13} />
            </button>
          </div>
        </div>

        {noteMenu === note.id && (
          <div
            data-task-menu-interactive
            className="absolute right-3 top-11 z-20 w-[140px] overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--panel)] shadow-lg"
          >
            <button
              type="button"
              className="danger-menu-item h-9 w-full px-3 text-left text-[13px]"
              onClick={(e) => {
                e.stopPropagation();
                requestTaskDeletion(note);
              }}
            >
              Delete task
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Routing Guards ───────────────────────────────────────────────────────────

  if (!authReady) {
    return (
      <SimpleScreen
        label="Loading"
        title="Connecting to Weekframe"
        body="Checking your Supabase session."
      />
    );
  }

  if (!viewer) {
    return (
      <AuthScreen
        email={authEmail}
        password={authPassword}
        error={authError}
        pending={authPending}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSignIn}
      />
    );
  }

  if (!routeSlug) {
    if (workspaceLoading) {
      return (
        <SimpleScreen
          label="Redirecting"
          title="Opening your workspace"
          body="Finding the first workspace you can access."
        />
      );
    }

    return (
      <SimpleScreen
        label="No workspace"
        title="No workspace access yet"
        body={
          workspaceError ||
          "This account is signed in, but it has not been added to a Weekframe workspace yet."
        }
        action={
          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            className="inline-flex items-center justify-center rounded-sm bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent-strong)]"
          >
            Sign out
          </button>
        }
      />
    );
  }

  if (workspaceLoading && !space) {
    return (
      <SimpleScreen
        label="Loading"
        title={`Opening /${routeSlug}`}
        body="Loading workspace access and planner data."
      />
    );
  }

  if (workspaceError) {
    return (
      <SimpleScreen
        label="Workspace"
        title="Could not open this workspace"
        body={workspaceError}
        action={
          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            className="inline-flex items-center justify-center rounded-sm bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent-strong)]"
          >
            Sign out
          </button>
        }
      />
    );
  }

  if (viewerRole === "pm") {
    return (
      <SimpleScreen
        label="PM view"
        title={`${space?.name ?? "Weekframe"} is connected`}
        body="PM review and assignment screens are the next phase. Sign in as the engineer account to use the live weekly planner right now."
        action={
          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            className="inline-flex items-center justify-center rounded-sm bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent-strong)]"
          >
            Sign out
          </button>
        }
      />
    );
  }

  if (!space) {
    return (
      <SimpleScreen
        label="Loading"
        title="Preparing your planner"
        body="Fetching tasks assigned to you."
      />
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────────

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg)] p-2 sm:p-3">
      <div className="app-shell flex h-full flex-col overflow-hidden rounded-sm">
        <div className="glass-toolbar flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center text-[var(--accent)]">
              <IconMemoryspace size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--muted)]">
                Weekframe · {viewerRole === "engineer" ? "Engineer" : "PM"}
              </p>
              <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                {displayName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="control-surface hidden h-9 items-center gap-3 rounded-sm px-3 lg:inline-flex">
              <span className="text-[13px] font-medium text-[var(--text)]">
                {formatWeekRangeLabel(plannerWeekStart)}
              </span>
              <span className="text-[13px] text-[var(--muted)]">
                {completedWeekCount}/{weeklyTasks.length} done
              </span>
            </div>

            <div className="control-surface inline-flex h-9 items-center gap-1 rounded-sm px-1">
              <button
                type="button"
                onClick={() => shiftPlannerWeek("prev")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                aria-label="Previous week"
              >
                <span className="inline-flex rotate-180">
                  <IconChevron size={11} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => shiftPlannerWeek("next")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                aria-label="Next week"
              >
                <IconChevron size={11} />
              </button>
            </div>

            {plannerWeekStart !== defaultPlannerWeekStartKey && (
              <button
                type="button"
                onClick={() => {
                  setPlannerWeekDirection(
                    plannerWeekStart < defaultPlannerWeekStartKey
                      ? "next"
                      : "prev",
                  );
                  setPlannerWeekStart(defaultPlannerWeekStartKey);
                }}
                className="control-surface hidden h-9 items-center justify-center rounded-sm px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)] sm:inline-flex"
              >
                This week
              </button>
            )}

            <button
              type="button"
              onClick={() => setStatsPanelOpen((prev) => !prev)}
              className="control-surface inline-flex h-9 items-center justify-center rounded-sm px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
            >
              {statsPanelOpen ? "Hide stats" : "Week stats"}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleCreateTask(defaultTaskDay ?? plannerWeekStart);
              }}
              disabled={!canEditPlanner}
              className="inline-flex h-9 min-w-[110px] items-center justify-center gap-2 rounded-sm bg-[var(--accent)] px-3 text-[13px] font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconPlus />
              <span>New task</span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="control-surface inline-flex h-9 w-9 items-center justify-center rounded-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              <IconSettings />
            </button>
          </div>
        </div>

        {saveError && (
          <div className="glass-toolbar border-b border-[var(--border)] px-4 py-2">
            <p className="text-[13px] text-[var(--danger-text)]">
              {saveError}
            </p>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            <div className="h-full px-3 py-3">
              <div
                key={plannerWeekStart}
                className={`grid h-full min-h-0 grid-cols-5 gap-3 ${
                  plannerWeekDirection === "next"
                    ? "planner-transition-next"
                    : plannerWeekDirection === "prev"
                      ? "planner-transition-prev"
                      : "fade-in"
                }`}
              >
                {plannerDays.map((day) => {
                  const doneCount = day.tasks.filter(
                    (task) => task.status === "done",
                  ).length;
                  const isDropTarget =
                    draggedTaskId !== null && dragOverDay === day.key;

                  return (
                    <section
                      key={day.key}
                      onDragOver={(event) =>
                        handlePlannerDayDragOver(event, day.key)
                      }
                      onDragEnter={(event) =>
                        handlePlannerDayDragOver(event, day.key)
                      }
                      onDragLeave={(event) =>
                        handlePlannerDayDragLeave(event, day.key)
                      }
                      onDrop={(event) => {
                        event.preventDefault();
                        handlePlannerDayDrop(day.key);
                      }}
                      className={`control-surface flex min-h-0 min-w-0 flex-col rounded-sm transition-[border-color,background-color,box-shadow] ${
                        isDropTarget ? "planner-drop-target" : ""
                      }`}
                    >
                      <div className="border-b border-[var(--border)] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-[var(--text)]">
                                {day.name}
                              </p>
                              {day.key === todayKey && (
                                <span className="rounded-sm border border-[var(--accent-soft)] bg-[var(--active)] px-1.5 py-0.5 text-[12px] text-[var(--accent)]">
                                  Today
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[13px] text-[var(--muted)]">
                              {day.dateLabel}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-7 min-w-[62px] items-center justify-center rounded-sm border px-2 text-[13px] ${STATUS_STYLES[day.tone].badge}`}
                            >
                              {day.tasks.length === 0
                                ? "Open"
                                : STATUS_LABELS[day.tone]}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCreateTask(day.key)}
                              className="control-surface inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--muted)] hover:text-[var(--text)]"
                              aria-label={`Add task for ${day.name}`}
                            >
                              <IconPlus size={11} />
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-[13px] text-[var(--muted)]">
                          {day.tasks.length === 0
                            ? "Nothing planned yet"
                            : `${doneCount}/${day.tasks.length} done`}
                        </p>
                      </div>

                      <div className="planner-day-body min-h-0 flex-1 overflow-y-auto p-3">
                        {day.tasks.length === 0 ? (
                          <div className="planner-day-placeholder flex h-full min-h-[180px] items-center justify-center rounded-sm border border-dashed border-[var(--border)] px-3 text-center text-[13px] text-[var(--muted)]">
                            Plan work for {day.name.toLowerCase()} here.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {day.tasks.map((note) =>
                              renderTaskCard(note, {
                                fallbackScheduledDate: day.key,
                              }),
                            )}
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </main>

          <aside
            className={`glass-toolbar shrink-0 overflow-hidden border-l border-[var(--border)] transition-[width,opacity] duration-200 ${
              statsPanelOpen ? "w-[220px] opacity-100" : "w-0 opacity-0"
            }`}
          >
            <div className="flex h-full w-[220px] flex-col gap-3 px-3 py-3">
              <div>
                <p className="text-[13px] font-semibold text-[var(--text)]">
                  Week stats
                </p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  {plannerMessage}
                </p>
              </div>

              <div className="overflow-hidden rounded-sm bg-[var(--hover)]">
                <div
                  className="h-2 rounded-sm bg-[var(--accent)] transition-[width] duration-200"
                  style={{ width: `${weekProgressPercent}%` }}
                />
              </div>

              <div className="space-y-2">
                {[
                  ["Added this week", tasksAddedThisWeekCount],
                  ["Done", completedWeekCount],
                  ["In progress", inProgressWeekCount],
                  ["Left", leftWeekCount],
                  ["Postponed", tasksPostponedThisWeekCount],
                  ["Other weeks", scheduledOutsideWeekCount],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="control-surface flex items-center justify-between rounded-sm px-3 py-2.5"
                  >
                    <span className="text-[13px] text-[var(--muted)]">
                      {label}
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--text)]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto text-[13px] text-[var(--muted)]">
                /{displaySlug}
                {lastSavedAt && (
                  <span className="block pt-1 opacity-70">
                    Saved {formatTimestamp(lastSavedAt)}
                  </span>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {taskEditorOpen && selectedTask && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/28 px-4 backdrop-blur-[6px]"
          onClick={closeTaskEditor}
        >
          <div
            className="task-modal-pop app-shell flex w-full max-w-[720px] max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-toolbar flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text)]">
                  {taskEditorMode === "create" ? "Create task" : "Task details"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTaskEditor}
                className="control-surface inline-flex h-9 w-9 items-center justify-center rounded-sm text-[var(--muted)] hover:text-[var(--text)]"
              >
                <IconX />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex h-full flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-[13px] text-[var(--muted)]">
                    Title
                  </label>
                  <input
                    value={selectedTask.title}
                    onChange={(e) =>
                      updateNoteById(selectedTask.id, {
                        title: e.target.value,
                      })
                    }
                    placeholder="Task title"
                    className="control-surface h-11 w-full rounded-sm px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] text-[var(--muted)]">
                    Day
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)]">
                      <IconCalendar size={12} />
                    </span>
                    <select
                      value={selectedTask.scheduledDate ?? ""}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        moveTaskToDate(selectedTask, e.target.value);
                      }}
                      className="control-surface h-11 w-full appearance-none rounded-sm pl-9 pr-9 text-[13px] text-[var(--text)] outline-none"
                    >
                      <option value="">Pick a day</option>
                      {selectedTaskScheduleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                      <span className="inline-flex rotate-90">
                        <IconChevron size={11} />
                      </span>
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] text-[var(--muted)]">
                    Labels
                  </label>
                  {selectedTaskLabelOptions.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {selectedTaskLabelOptions.map((label) => {
                        const selected = selectedTask.labels.includes(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleTaskLabel(selectedTask, label)}
                            className={`inline-flex h-9 shrink-0 items-center justify-center rounded-sm border px-3 text-[13px] transition-colors ${
                              selected
                                ? "border-[var(--accent)] bg-[var(--active)] text-[var(--accent)]"
                                : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[13px] text-[var(--muted)]">
                      Add label presets in settings to use them here.
                    </p>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                  <label className="mb-1.5 block text-[13px] text-[var(--muted)]">
                    Notes
                  </label>
                  <textarea
                    value={selectedTask.content}
                    onChange={(e) =>
                      updateNoteById(selectedTask.id, {
                        content: e.target.value,
                      })
                    }
                    placeholder="Capture context, next steps, or links."
                    className="control-surface min-h-[220px] flex-1 rounded-sm px-3 py-2.5 text-[13px] leading-[1.6] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  />
                </div>

                {selectedTaskLinks.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[13px] text-[var(--muted)]">
                        Link previews
                      </span>
                      <span className="text-[13px] text-[var(--muted)]">
                        {selectedTaskLinks.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedTaskLinks.map((link) => (
                        <LinkPreviewCard
                          key={link.href}
                          preview={link}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {taskEditorMode === "create" && (
              <div className="glass-toolbar flex items-center justify-end border-t border-[var(--border)] px-4 py-3">
                <button
                  type="button"
                  onClick={closeTaskEditor}
                  className="inline-flex h-9 min-w-[120px] items-center justify-center rounded-sm bg-[var(--accent)] px-4 text-[13px] font-medium text-white hover:bg-[var(--accent-strong)]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteConfirmTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/28 px-4 backdrop-blur-[6px]"
          onClick={() => setDeleteConfirmTask(null)}
        >
          <div
            className="fade-in app-shell w-full max-w-[360px] rounded-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-toolbar flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">
                Delete task
              </h2>
              <button
                type="button"
                onClick={() => setDeleteConfirmTask(null)}
                className="control-surface inline-flex h-9 w-9 items-center justify-center rounded-sm text-[var(--muted)] hover:text-[var(--text)]"
              >
                <IconX />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                Delete{" "}
                <span className="font-semibold text-[var(--text)]">
                  {deleteConfirmTask.title || "Untitled task"}
                </span>
                ? This can&apos;t be undone.
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTask(null)}
                  className="control-surface inline-flex h-9 items-center justify-center rounded-sm px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmTaskDeletion}
                  className="danger-button inline-flex h-9 items-center justify-center rounded-sm px-3 text-[13px] font-medium"
                >
                  Delete task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Settings modal ─── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[3px] px-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="fade-in app-shell w-full max-w-[420px] rounded-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="glass-toolbar flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">
                Settings
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="control-surface w-9 h-9 flex items-center justify-center rounded-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <IconX />
              </button>
            </div>

            {/* Appearance */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-[13px] font-medium text-[var(--text)]">
                  Appearance
                </p>
                <p className="text-[13px] text-[var(--muted)] mt-0.5 opacity-70">
                  Light or dark theme
                </p>
              </div>
              <div className="control-surface flex rounded-sm overflow-hidden text-[13px] shrink-0">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`px-3 py-1.5 transition-colors ${
                    theme === "light"
                      ? "bg-[var(--active)] text-[var(--text)] font-medium"
                      : "text-[var(--muted)] hover:bg-[var(--hover)]"
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`px-3 py-1.5 border-l border-[var(--border)] transition-colors ${
                    theme === "dark"
                      ? "bg-[var(--active)] text-[var(--text)] font-medium"
                      : "text-[var(--muted)] hover:bg-[var(--hover)]"
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-[var(--border)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-[var(--text)]">
                    Label presets
                  </p>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5 opacity-70">
                    Ready-made labels for quick task tagging
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {labelPresets.map((label) => (
                  <span
                    key={label}
                    className="group/preset inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--border)] px-3 text-[13px] text-[var(--muted)]"
                  >
                    {label}
                    <button
                      type="button"
                      aria-label={`Remove preset ${label}`}
                      onClick={() => removeLabelPreset(label)}
                      className="opacity-0 transition-opacity group-hover/preset:opacity-100"
                    >
                      <IconX size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={presetLabelDraft}
                  onChange={(e) => setPresetLabelDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addLabelPreset(presetLabelDraft);
                    }
                  }}
                  placeholder="Add preset label"
                  className="control-surface h-9 min-w-0 flex-1 rounded-sm px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />
                <button
                  type="button"
                  onClick={() => addLabelPreset(presetLabelDraft)}
                  className="control-surface inline-flex h-9 shrink-0 items-center justify-center rounded-sm px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-[13px] font-medium text-[var(--text)]">
                  Export this week
                </p>
                <p className="text-[13px] text-[var(--muted)] mt-0.5 opacity-70">
                  Download only the tasks in the current planner week
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={!space || weeklyTasks.length === 0}
                className="control-surface inline-flex shrink-0 items-center gap-2 rounded-sm px-3 py-1.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IconExport />
                <span>Export</span>
              </button>
            </div>

            {/* Export all */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-[13px] font-medium text-[var(--text)]">
                  Export all items
                </p>
                <p className="text-[13px] text-[var(--muted)] mt-0.5 opacity-70">
                  Download the full weekly workspace as markdown
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportAll}
                disabled={!space || notes.length === 0}
                className="control-surface text-[13px] font-medium text-[var(--text)] px-3 py-1.5 rounded-sm hover:bg-[var(--hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Export
              </button>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-[13px] font-medium text-[var(--text)]">
                  Clear local preferences
                </p>
                <p className="text-[13px] text-[var(--muted)] mt-0.5 opacity-70">
                  Resets theme and preset labels on this device only
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearLocalPreferences}
                className="control-surface shrink-0 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--hover)]"
              >
                Clear
              </button>
            </div>

            <div className="px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  void handleSignOut();
                }}
                className="danger-button inline-flex h-9 items-center justify-center rounded-sm px-3 text-[13px] font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
