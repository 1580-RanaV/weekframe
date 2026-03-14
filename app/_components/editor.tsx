"use client";

import type { Note } from "./types";
import { formatTimestamp } from "./helpers";
import { IconX } from "./icons";

export interface EditorProps {
  selectedNote: Note | null;
  folders: string[];
  lastSavedAt: string | null;
  addingLabel: boolean;
  labelDraft: string;
  onSetActiveFolder: (folder: string) => void;
  onUpdateNote: (patch: Partial<Pick<Note, "title" | "content" | "folder" | "labels">>) => void;
  onCreateNote: () => void;
  onSetAddingLabel: (v: boolean) => void;
  onSetLabelDraft: (v: string) => void;
}

export default function Editor({
  selectedNote,
  folders,
  lastSavedAt,
  addingLabel,
  labelDraft,
  onSetActiveFolder,
  onUpdateNote,
  onCreateNote,
  onSetAddingLabel,
  onSetLabelDraft,
}: EditorProps) {
  if (!selectedNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-xs text-[var(--muted)]">
          Select a note or create a new one.
        </p>
        <button
          type="button"
          onClick={onCreateNote}
          className="mt-2.5 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          Create note
        </button>
      </div>
    );
  }

  function commitLabel() {
    if (!selectedNote) return;
    const trimmed = labelDraft.trim().replace(/,/g, "");
    if (trimmed && !selectedNote.labels.includes(trimmed)) {
      onUpdateNote({ labels: [...selectedNote.labels, trimmed] });
    }
    onSetLabelDraft("");
    onSetAddingLabel(false);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 flex items-center gap-1 px-4 border-b border-[var(--border)] shrink-0">
        <select
          value={selectedNote.folder}
          onChange={(e) => {
            onSetActiveFolder(e.target.value);
            onUpdateNote({ folder: e.target.value });
          }}
          className="text-xs text-[var(--muted)] bg-transparent border-none outline-none cursor-pointer hover:text-[var(--text)] transition-colors py-0.5 px-1 rounded hover:bg-[var(--hover)] max-w-[160px]"
        >
          <option value="">Unfiled</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f.split("/").join(" / ")}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[var(--muted)] opacity-50">
            {lastSavedAt
              ? `Saved ${formatTimestamp(lastSavedAt)}`
              : "Waiting to save…"}
          </span>
          <span className="soft-pulse h-[5px] w-[5px] rounded-full bg-[var(--accent)] inline-block shrink-0" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto note-scroll">
        <div className="max-w-[660px] mx-auto px-12 py-8">
          {/* Title */}
          <input
            value={selectedNote.title}
            onChange={(e) => onUpdateNote({ title: e.target.value })}
            placeholder="Untitled note"
            className="w-full text-base font-semibold bg-transparent border-none outline-none text-[var(--text)] placeholder:text-[var(--muted)] leading-snug"
          />

          {/* Labels + metadata row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-2.5">
            {selectedNote.labels.map((label) => (
              <span
                key={label}
                className="group/pill inline-flex items-center gap-1 text-xs px-2 py-[2px] rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-red-400 hover:text-red-400"
              >
                {label}
                <button
                  type="button"
                  aria-label={`Remove label ${label}`}
                  onClick={() =>
                    onUpdateNote({
                      labels: selectedNote.labels.filter((l) => l !== label),
                    })
                  }
                  className="opacity-0 group-hover/pill:opacity-100 transition-opacity leading-none"
                >
                  <IconX size={9} />
                </button>
              </span>
            ))}

            {addingLabel ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={(e) => onSetLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitLabel();
                  } else if (e.key === "Escape") {
                    onSetLabelDraft("");
                    onSetAddingLabel(false);
                  }
                }}
                onBlur={commitLabel}
                placeholder="Label name…"
                className="text-xs px-2 py-[2px] rounded-full border border-[var(--accent)] bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--muted)] w-[110px]"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSetAddingLabel(true)}
                className="text-xs px-1.5 py-[2px] rounded-full border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                + Add label
              </button>
            )}

            {(selectedNote.labels.length > 0 || !addingLabel) && (
              <>
                {selectedNote.folder && (
                  <>
                    <span className="text-[var(--border)] text-xs">·</span>
                    <span className="text-xs text-[var(--muted)]">
                      {selectedNote.folder.split("/").join(" / ")}
                    </span>
                  </>
                )}
                <span className="text-[var(--border)] text-xs">·</span>
                <span className="text-xs text-[var(--muted)]">
                  {formatTimestamp(selectedNote.updatedAt, "long")}
                </span>
              </>
            )}
          </div>

          <div className="mt-3 h-px bg-[var(--border)]" />

          {/* Body */}
          <textarea
            value={selectedNote.content}
            onChange={(e) => onUpdateNote({ content: e.target.value })}
            placeholder="Start writing…"
            className="mt-5 w-full min-h-[calc(100vh-220px)] bg-transparent outline-none text-sm leading-[1.8] text-[var(--text)] placeholder:text-[var(--muted)] resize-none"
          />
        </div>
      </div>
    </div>
  );
}
