"use client";

import { createContext, useContext, type FormEvent, type RefObject } from "react";
import type { Note, FolderNode } from "./types";
import { getFolderNoteCount, formatTimestamp } from "./helpers";
import {
  IconPlus,
  IconFolder,
  IconChevron,
  IconDots,
  IconNote,
  IconSettings,
} from "./icons";

// ─── Internal context to avoid prop-drilling through recursive FolderItem ────

interface FolderTreeCtx {
  resolvedActiveFolder: string;
  notes: Note[];
  expandedFolders: Set<string>;
  addingFolderParent: string | null;
  folderMenu: string | null;
  folderDraft: string;
  folderError: string;
  folderInputRef: RefObject<HTMLInputElement>;
  onSetActiveFolder: (folder: string) => void;
  onCreateFolder: (e: FormEvent<HTMLFormElement>) => void;
  onDeleteFolder: (path: string) => void;
  onSetFolderDraft: (v: string) => void;
  onClearFolderError: () => void;
  onSetAddingFolderParent: (v: string | null) => void;
  onToggleExpand: (path: string) => void;
  onSetFolderMenu: (v: string | null) => void;
  onStartAddingSubfolder: (path: string) => void;
}

const FolderTreeContext = createContext<FolderTreeCtx | null>(null);

function useFolderTree() {
  const ctx = useContext(FolderTreeContext);
  if (!ctx) throw new Error("FolderItem must be used inside FolderTreeContext");
  return ctx;
}

// ─── FolderItem ───────────────────────────────────────────────────────────────

function FolderItem({ node, depth }: { node: FolderNode; depth: number }) {
  const {
    resolvedActiveFolder,
    notes,
    expandedFolders,
    addingFolderParent,
    folderMenu,
    folderDraft,
    folderError,
    folderInputRef,
    onSetActiveFolder,
    onCreateFolder,
    onDeleteFolder,
    onSetFolderDraft,
    onClearFolderError,
    onSetAddingFolderParent,
    onToggleExpand,
    onSetFolderMenu,
    onStartAddingSubfolder,
  } = useFolderTree();

  const isActive = resolvedActiveFolder === node.path;
  const isAncestor = resolvedActiveFolder.startsWith(node.path + "/");
  const isExpanded = expandedFolders.has(node.path);
  const isMenuOpen = folderMenu === node.path;
  const hasChildren = node.children.length > 0;
  const willExpand = hasChildren || addingFolderParent === node.path;
  const totalCount = getFolderNoteCount(node.path, notes);
  const paddingLeft = 8 + depth * 14;

  return (
    <div key={node.path}>
      <div
        style={{ paddingLeft: `${paddingLeft}px` }}
        className={`group relative flex items-center gap-1 pr-1.5 py-[5px] rounded-[5px] cursor-pointer select-none transition-colors mx-1 ${
          isActive
            ? "bg-[var(--active)] text-[var(--text)]"
            : "text-[var(--text)] hover:bg-[var(--hover)]"
        }`}
        onClick={() => onSetActiveFolder(node.path)}
      >
        {/* Expand arrow */}
        <button
          type="button"
          className={`w-4 h-4 flex items-center justify-center shrink-0 text-[var(--muted)] rounded hover:bg-[rgba(0,0,0,0.06)] transition-all ${
            willExpand ? "" : "invisible"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.path);
          }}
        >
          <span
            className="transition-transform duration-150 inline-flex"
            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <IconChevron />
          </span>
        </button>

        {/* Folder icon */}
        <span
          className={`shrink-0 ${isActive || isAncestor ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
        >
          <IconFolder size={12} />
        </span>

        {/* Name */}
        <span className={`flex-1 text-xs truncate ml-0.5 ${isActive ? "font-medium" : ""}`}>
          {node.name}
        </span>

        {/* Count */}
        {totalCount > 0 && (
          <span className="text-xs text-[var(--muted)] tabular-nums shrink-0 mr-0.5 opacity-60">
            {totalCount}
          </span>
        )}

        {/* 3-dot menu */}
        <button
          type="button"
          className={`w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[rgba(0,0,0,0.06)] transition-colors shrink-0 ${
            isMenuOpen
              ? "opacity-100 bg-[rgba(0,0,0,0.06)]"
              : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSetFolderMenu(isMenuOpen ? null : node.path);
          }}
        >
          <IconDots />
        </button>

        {/* Context menu */}
        {isMenuOpen && (
          <div className="absolute right-1 top-7 z-20 w-[148px] bg-[var(--panel)] border border-[var(--border)] rounded-[7px] shadow-lg py-1 text-xs overflow-hidden">
            <button
              type="button"
              className="w-full text-left px-3 py-1 text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onStartAddingSubfolder(node.path);
              }}
            >
              Add subfolder
            </button>
            <div className="my-1 h-px bg-[var(--border)]" />
            <button
              type="button"
              className="w-full text-left px-3 py-1 text-red-500 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onSetFolderMenu(null);
                onDeleteFolder(node.path);
              }}
            >
              Delete folder
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderItem key={child.path} node={child} depth={depth + 1} />
          ))}

          {/* Inline add-subfolder input */}
          {addingFolderParent === node.path && (
            <div
              style={{ paddingLeft: `${paddingLeft + 14 + 4}px` }}
              className="pr-2 py-0.5 mx-1"
            >
              <form onSubmit={onCreateFolder}>
                <input
                  ref={folderInputRef}
                  value={folderDraft}
                  onChange={(e) => {
                    onSetFolderDraft(e.target.value);
                    if (folderError) onClearFolderError();
                  }}
                  onBlur={() => {
                    if (!folderDraft.trim()) onSetAddingFolderParent(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      onSetAddingFolderParent(null);
                      onSetFolderDraft("");
                      onClearFolderError();
                    }
                  }}
                  placeholder="Subfolder name"
                  className="w-full text-xs bg-[var(--panel)] border border-[var(--border)] rounded-[5px] px-2.5 py-[4px] outline-none focus:border-[var(--accent)] text-[var(--text)] transition-colors"
                />
                {folderError && (
                  <p className="text-xs text-red-500 mt-0.5 px-0.5">
                    {folderError}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export interface SidebarProps {
  displayName: string;
  displaySlug: string;
  lastSavedAt: string | null;
  resolvedActiveFolder: string;
  unfiledCount: number;
  folderTree: FolderNode[];
  notes: Note[];
  isLocked: boolean;
  addingFolderParent: string | null;
  expandedFolders: Set<string>;
  folderMenu: string | null;
  folderDraft: string;
  folderError: string;
  folderInputRef: RefObject<HTMLInputElement>;
  onSetActiveFolder: (folder: string) => void;
  onCreateFolder: (e: FormEvent<HTMLFormElement>) => void;
  onDeleteFolder: (path: string) => void;
  onOpenSettings: () => void;
  onSetFolderDraft: (v: string) => void;
  onClearFolderError: () => void;
  onSetAddingFolderParent: (v: string | null) => void;
  onToggleExpand: (path: string) => void;
  onSetFolderMenu: (v: string | null) => void;
  onStartAddingSubfolder: (path: string) => void;
}

export default function Sidebar({
  displayName,
  displaySlug,
  lastSavedAt,
  resolvedActiveFolder,
  unfiledCount,
  folderTree,
  notes,
  isLocked,
  addingFolderParent,
  expandedFolders,
  folderMenu,
  folderDraft,
  folderError,
  folderInputRef,
  onSetActiveFolder,
  onCreateFolder,
  onDeleteFolder,
  onOpenSettings,
  onSetFolderDraft,
  onClearFolderError,
  onSetAddingFolderParent,
  onToggleExpand,
  onSetFolderMenu,
  onStartAddingSubfolder,
}: SidebarProps) {
  return (
    <FolderTreeContext.Provider
      value={{
        resolvedActiveFolder,
        notes,
        expandedFolders,
        addingFolderParent,
        folderMenu,
        folderDraft,
        folderError,
        folderInputRef,
        onSetActiveFolder,
        onCreateFolder,
        onDeleteFolder,
        onSetFolderDraft,
        onClearFolderError,
        onSetAddingFolderParent,
        onToggleExpand,
        onSetFolderMenu,
        onStartAddingSubfolder,
      }}
    >
      <aside
        className={`w-[200px] shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] flex flex-col transition-opacity ${
          isLocked ? "pointer-events-none opacity-40" : ""
        }`}
      >
        {/* Space header */}
        <div className="h-10 flex items-center px-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-[17px] h-[17px] rounded-[4px] bg-[var(--accent)] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold leading-none select-none">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-medium text-[var(--text)] truncate">
              {displayName}
            </span>
          </div>
        </div>

        {/* Folder navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden note-scroll py-1.5">
          {/* All notes (unfiled) */}
          <div className="px-1.5">
            <button
              type="button"
              onClick={() => onSetActiveFolder("")}
              className={`w-full flex items-center justify-between px-2 py-[5px] rounded-[5px] text-xs transition-colors ${
                resolvedActiveFolder === ""
                  ? "bg-[var(--active)] text-[var(--text)] font-medium"
                  : "text-[var(--text)] hover:bg-[var(--hover)]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--muted)] opacity-70">
                  <IconNote size={13} />
                </span>
                <span>Notes</span>
              </div>
              {unfiledCount > 0 && (
                <span className="text-xs text-[var(--muted)] tabular-nums">
                  {unfiledCount}
                </span>
              )}
            </button>
          </div>

          {/* Folders label */}
          <div className="mt-3 mb-0.5 px-3.5">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-[0.1em]">
              Folders
            </p>
          </div>

          {/* Folder tree */}
          <div className="space-y-px">
            {folderTree.map((node) => (
              <FolderItem key={node.path} node={node} depth={0} />
            ))}
          </div>

          {/* Root-level add folder */}
          {addingFolderParent === "" ? (
            <div className="px-1.5 mt-0.5">
              <form onSubmit={onCreateFolder}>
                <input
                  ref={folderInputRef}
                  value={folderDraft}
                  onChange={(e) => {
                    onSetFolderDraft(e.target.value);
                    if (folderError) onClearFolderError();
                  }}
                  onBlur={() => {
                    if (!folderDraft.trim()) onSetAddingFolderParent(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      onSetAddingFolderParent(null);
                      onSetFolderDraft("");
                      onClearFolderError();
                    }
                  }}
                  placeholder="Folder name"
                  className="w-full text-xs bg-[var(--panel)] border border-[var(--border)] rounded-[5px] px-2.5 py-[4px] outline-none focus:border-[var(--accent)] text-[var(--text)] transition-colors"
                />
                {folderError && (
                  <p className="text-xs text-red-500 mt-0.5 px-0.5">
                    {folderError}
                  </p>
                )}
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSetAddingFolderParent("");
                onSetFolderDraft("");
                onClearFolderError();
              }}
              className="flex items-center gap-1.5 px-3.5 py-[5px] mt-0.5 mx-1 text-xs text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors rounded-[5px]"
            >
              <IconPlus size={11} />
              <span>Add folder</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-[var(--border)] shrink-0 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-mono text-[var(--muted)] truncate opacity-60">
              /{displaySlug}
            </p>
            {lastSavedAt && (
              <p className="text-xs text-[var(--muted)] mt-0.5 opacity-50">
                Saved {formatTimestamp(lastSavedAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className="w-6 h-6 flex items-center justify-center rounded-[5px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors shrink-0"
          >
            <IconSettings />
          </button>
        </div>
      </aside>
    </FolderTreeContext.Provider>
  );
}
