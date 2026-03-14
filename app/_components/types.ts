export const STORAGE_KEYS = {
  space: "memoryspace.space",
  folders: "memoryspace.folders",
  notes: "memoryspace.notes",
  labels: "memoryspace.labels",
};

export interface SpaceIdentity {
  name: string;
  slug: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  folder: string;
  labels: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderNode {
  path: string;
  name: string;
  children: FolderNode[];
}

export interface WorkspaceState {
  hydrated: boolean;
  space: SpaceIdentity | null;
  folders: string[];
  notes: Note[];
  spaceLabels: string[];
  activeFolder: string;
  selectedNoteId: string;
  lastSavedAt: string | null;
}

export type WorkspaceAction =
  | {
      type: "hydrate";
      payload: {
        space: SpaceIdentity | null;
        folders: string[];
        notes: Note[];
        spaceLabels: string[];
        lastSavedAt: string | null;
      };
    }
  | {
      type: "commit-space";
      space: SpaceIdentity;
      savedAt: string;
      initialFolders?: string[];
      initialNotes?: Note[];
      initialLabels?: string[];
    }
  | { type: "set-active-folder"; folder: string }
  | { type: "select-note"; noteId: string }
  | { type: "create-folder"; folder: string }
  | { type: "delete-folder"; folder: string; fallbackFolder: string }
  | { type: "create-note"; note: Note }
  | {
      type: "update-note";
      noteId: string;
      patch: Partial<Pick<Note, "title" | "content" | "folder" | "labels">>;
      updatedAt: string;
    }
  | { type: "delete-note"; noteId: string }
  | { type: "set-last-saved"; value: string }
  | { type: "create-label"; label: string }
  | { type: "delete-label"; label: string };

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        hydrated: true,
        space: action.payload.space,
        folders: action.payload.folders,
        notes: action.payload.notes,
        spaceLabels: action.payload.spaceLabels,
        activeFolder: action.payload.folders[0] ?? "",
        selectedNoteId: action.payload.notes[0]?.id ?? "",
        lastSavedAt: action.payload.lastSavedAt,
      };
    case "commit-space": {
      const newFolders = action.initialFolders ?? state.folders;
      const newNotes = action.initialNotes ?? state.notes;
      const newLabels = action.initialLabels ?? state.spaceLabels;
      return {
        ...state,
        space: action.space,
        lastSavedAt: action.savedAt,
        folders: newFolders,
        notes: newNotes,
        spaceLabels: newLabels,
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
    case "create-label": {
      if (state.spaceLabels.includes(action.label)) return state;
      return { ...state, spaceLabels: [...state.spaceLabels, action.label] };
    }
    case "delete-label": {
      return {
        ...state,
        spaceLabels: state.spaceLabels.filter((l) => l !== action.label),
        notes: state.notes.map((n) =>
          n.labels.includes(action.label)
            ? { ...n, labels: n.labels.filter((l) => l !== action.label) }
            : n,
        ),
      };
    }
    default:
      return state;
  }
}
