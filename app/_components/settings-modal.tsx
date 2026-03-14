"use client";

import type { SpaceIdentity, Note } from "./types";
import { IconX } from "./icons";

export interface SettingsModalProps {
  theme: "light" | "dark";
  space: SpaceIdentity | null;
  notes: Note[];
  onSetTheme: (t: "light" | "dark") => void;
  onExportAll: () => void;
  onResetData: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  theme,
  space,
  notes,
  onSetTheme,
  onExportAll,
  onResetData,
  onClose,
}: SettingsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[3px] px-4"
      onClick={onClose}
    >
      <div
        className="fade-in w-full max-w-[380px] bg-[var(--panel)] rounded-[12px] border border-[var(--border)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-xs font-semibold text-[var(--text)]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-[5px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* Appearance */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-medium text-[var(--text)]">Appearance</p>
            <p className="text-xs text-[var(--muted)] mt-0.5 opacity-70">
              Light or dark theme
            </p>
          </div>
          <div className="flex rounded-[5px] border border-[var(--border)] overflow-hidden text-xs shrink-0">
            <button
              type="button"
              onClick={() => onSetTheme("light")}
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
              onClick={() => onSetTheme("dark")}
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

        {/* Export all */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-medium text-[var(--text)]">
              Export all notes
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5 opacity-70">
              Download everything as markdown
            </p>
          </div>
          <button
            type="button"
            onClick={onExportAll}
            disabled={!space || notes.length === 0}
            className="text-xs font-medium text-[var(--text)] border border-[var(--border)] px-2.5 py-1 rounded-[5px] hover:bg-[var(--hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Export
          </button>
        </div>

        {/* Reset */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-xs font-medium text-[var(--text)]">
              Reset all data
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5 opacity-70">
              Permanently deletes all notes and folders
            </p>
          </div>
          <button
            type="button"
            onClick={onResetData}
            className="text-xs font-medium text-red-500 border border-red-200 px-2.5 py-1 rounded-[5px] hover:bg-red-50 transition-colors shrink-0"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
