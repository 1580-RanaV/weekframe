import { STORAGE_KEYS } from "./types";
import type { SpaceIdentity, Note, FolderNode } from "./types";

export function buildFolderTree(folders: string[]): FolderNode[] {
  const sorted = [...folders].sort();
  const nodeMap = new Map<string, FolderNode>();
  sorted.forEach((path) => {
    nodeMap.set(path, { path, name: path.split("/").pop()!, children: [] });
  });
  const roots: FolderNode[] = [];
  sorted.forEach((path) => {
    const node = nodeMap.get(path)!;
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash === -1) {
      roots.push(node);
    } else {
      const parentPath = path.slice(0, lastSlash);
      const parent = nodeMap.get(parentPath);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });
  return roots;
}

export function getFolderNoteCount(folderPath: string, notes: Note[]) {
  return notes.filter(
    (n) => n.folder === folderPath || n.folder.startsWith(folderPath + "/"),
  ).length;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values.map((v) => v.trim()).filter((v) => v.length > 0),
    ),
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readStoredJson(key: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function parseSpace(value: unknown): SpaceIdentity | null {
  if (!isRecord(value)) return null;
  const { name, slug, createdAt } = value;
  if (
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof createdAt !== "string"
  )
    return null;
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) return null;
  return { name: name.trim(), slug: normalizedSlug, createdAt };
}

export function parseFolders(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const folders = uniqueStrings(
    value.filter((e): e is string => typeof e === "string"),
  );
  return folders.length > 0 ? folders : null;
}

export function parseLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(
    value.filter((e): e is string => typeof e === "string"),
  );
}

export function parseNotes(value: unknown): Note[] | null {
  if (!Array.isArray(value)) return null;
  const notes = value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const { id, title, folder, labels, type, content, createdAt, updatedAt } =
      entry;
    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      typeof folder !== "string" ||
      typeof content !== "string" ||
      typeof createdAt !== "string" ||
      typeof updatedAt !== "string"
    )
      return [];
    let resolvedLabels: string[] = [];
    if (Array.isArray(labels)) {
      resolvedLabels = labels.filter((l): l is string => typeof l === "string");
    } else if (typeof type === "string" && type.length > 0) {
      resolvedLabels = [type];
    }
    return [
      { id, title, folder: folder.trim(), labels: resolvedLabels, content, createdAt, updatedAt },
    ];
  });
  return notes.length > 0 ? notes : null;
}

export function mergeFolders(folders: string[], notes: Note[]) {
  return uniqueStrings([
    ...folders,
    ...notes.map((n) => n.folder).filter((f) => f !== ""),
  ]);
}

export function formatTimestamp(value: string, format: "short" | "long" = "short") {
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

export function titleDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function extractPreview(content: string, maxLength = 90) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}…`;
}

export function latestTimestamp(notes: Note[], fallback: string) {
  const values = notes
    .map((n) => new Date(n.updatedAt).valueOf())
    .filter((v) => !Number.isNaN(v));
  if (values.length === 0) return fallback;
  return new Date(Math.max(...values)).toISOString();
}

export function persistWorkspace(
  space: SpaceIdentity,
  folders: string[],
  notes: Note[],
  spaceLabels: string[] = [],
) {
  window.localStorage.setItem(STORAGE_KEYS.space, JSON.stringify(space));
  window.localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(folders));
  window.localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  window.localStorage.setItem(STORAGE_KEYS.labels, JSON.stringify(spaceLabels));
}

export function exportMarkdown(
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
    lines.push(`- Folder: ${note.folder || "Unfiled"}`);
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

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(blobUrl);
}

// ─── Label colors ──────────────────────────────────────────────────────────────

export const LABEL_PALETTE = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#eab308", // amber
  "#ef4444", // red
];

export function getLabelColor(label: string, spaceLabels: string[]): string {
  const idx = spaceLabels.indexOf(label);
  return LABEL_PALETTE[(idx >= 0 ? idx : 0) % LABEL_PALETTE.length];
}
