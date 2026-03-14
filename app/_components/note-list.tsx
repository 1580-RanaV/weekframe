"use client";

import type { Note, SpaceIdentity } from "./types";
import { formatTimestamp, extractPreview } from "./helpers";
import { IconPlus, IconExport, IconSearch, IconDots } from "./icons";

export interface NoteListProps {
  filteredNotes: Note[];
  selectedNote: Note | null;
  folderBreadcrumb: { name: string; isLast: boolean }[];
  filterLabel: string | null;
  folderLabels: string[];
  searchQuery: string;
  resolvedActiveFolder: string;
  space: SpaceIdentity | null;
  noteMenu: string | null;
  isLocked: boolean;
  onSetSearchQuery: (v: string) => void;
  onSetFilterLabel: (v: string | null) => void;
  onSetNoteMenu: (v: string | null) => void;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onCreateNote: () => void;
  onExport: () => void;
}

export default function NoteList({
  filteredNotes,
  selectedNote,
  folderBreadcrumb,
  filterLabel,
  folderLabels,
  searchQuery,
  resolvedActiveFolder,
  space,
  noteMenu,
  isLocked,
  onSetSearchQuery,
  onSetFilterLabel,
  onSetNoteMenu,
  onSelectNote,
  onDeleteNote,
  onCreateNote,
  onExport,
}: NoteListProps) {
  return (
    <div
      className={`w-[260px] shrink-0 border-r border-[var(--border)] bg-[var(--bg)] flex flex-col transition-opacity ${
        isLocked ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-0.5 min-w-0 text-xs">
          {folderBreadcrumb.map((part, i) => (
            <span
              key={i}
              className={
                part.isLast
                  ? "font-semibold text-[var(--text)] truncate"
                  : "text-[var(--muted)] shrink-0"
              }
            >
              {i > 0 && <span className="mx-0.5 text-[var(--muted)]">/</span>}
              {part.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {space && filteredNotes.length > 0 && (
            <button
              type="button"
              onClick={onExport}
              title="Export current view"
              className="flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
            >
              <IconExport />
              <span>Export</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCreateNote}
            title="New note"
            className="w-6 h-6 flex items-center justify-center rounded-[5px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
          >
            <IconPlus />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2.5 py-2 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-1.5 bg-[var(--hover)] rounded-[5px] px-2 py-[5px]">
          <span className="text-[var(--muted)] shrink-0 opacity-60">
            <IconSearch />
          </span>
          <input
            value={searchQuery}
            onChange={(e) => onSetSearchQuery(e.target.value)}
            placeholder="Search notes…"
            className="flex-1 text-xs bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--muted)]"
          />
        </div>

        {/* Label filter chips */}
        {folderLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 pb-2">
            {folderLabels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  onSetFilterLabel(filterLabel === label ? null : label)
                }
                className={`text-xs px-2 py-[3px] rounded-full border transition-colors ${
                  filterLabel === label
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Note cards */}
      <div className="flex-1 overflow-y-auto note-scroll pt-1">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-5 text-center">
            <p className="text-xs text-[var(--muted)]">No notes yet.</p>
            <button
              type="button"
              onClick={onCreateNote}
              className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Create one
            </button>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const subPath =
              note.folder !== resolvedActiveFolder
                ? note.folder
                    .split("/")
                    .slice(resolvedActiveFolder.split("/").length)
                    .join("/")
                : null;

            return (
              <div
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectNote(note.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectNote(note.id);
                }}
                className={`group relative w-full px-3 py-2.5 border-b border-[var(--border)] text-left cursor-pointer transition-colors outline-none ${
                  selectedNote?.id === note.id
                    ? "bg-[var(--active)]"
                    : "hover:bg-[var(--hover)]"
                }`}
              >
                {/* Row 1: title + date */}
                <div className="flex items-baseline justify-between gap-2 pr-5">
                  <p className="text-xs font-medium text-[var(--text)] truncate">
                    {note.title}
                  </p>
                  <span className="text-xs text-[var(--muted)] shrink-0 opacity-60">
                    {formatTimestamp(note.updatedAt)}
                  </span>
                </div>

                {/* Row 2: label pills + subfolder badge */}
                {(note.labels.length > 0 || subPath) && (
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {note.labels.map((label) => (
                      <span
                        key={label}
                        className="text-xs px-1.5 py-[2px] rounded-full border border-[var(--border)] text-[var(--muted)] shrink-0 leading-none"
                      >
                        {label}
                      </span>
                    ))}
                    {subPath && (
                      <span className="text-xs text-[var(--muted)] bg-[var(--hover)] px-1.5 py-[2px] rounded-[3px] truncate max-w-[80px]">
                        {subPath}
                      </span>
                    )}
                  </div>
                )}

                {/* Row 3: preview */}
                <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed line-clamp-2 opacity-70">
                  {extractPreview(note.content)}
                </p>

                {/* 3-dot menu */}
                <button
                  type="button"
                  className={`absolute top-2.5 right-2 z-20 w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[rgba(0,0,0,0.07)] transition-colors ${
                    noteMenu === note.id
                      ? "opacity-100 bg-[rgba(0,0,0,0.07)]"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetNoteMenu(noteMenu === note.id ? null : note.id);
                  }}
                >
                  <IconDots size={13} />
                </button>

                {/* Note context menu */}
                {noteMenu === note.id && (
                  <div className="absolute right-1 top-8 z-20 w-[128px] bg-[var(--panel)] border border-[var(--border)] rounded-[7px] shadow-lg py-1 text-xs overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetNoteMenu(null);
                        onDeleteNote(note.id);
                      }}
                    >
                      Delete note
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
