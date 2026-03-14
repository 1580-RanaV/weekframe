"use client";

import type { FormEvent, RefObject } from "react";

export interface SpaceSetupModalProps {
  spaceNameDraft: string;
  spaceError: string;
  draftSlug: string;
  spaceNameInputRef: RefObject<HTMLInputElement>;
  onSetSpaceNameDraft: (v: string) => void;
  onClearSpaceError: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export default function SpaceSetupModal({
  spaceNameDraft,
  spaceError,
  draftSlug,
  spaceNameInputRef,
  onSetSpaceNameDraft,
  onClearSpaceError,
  onSubmit,
}: SpaceSetupModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[3px] px-4">
      <form
        onSubmit={onSubmit}
        className="fade-in w-full max-w-[420px] bg-[var(--panel)] rounded-[12px] border border-[var(--border)] shadow-2xl p-6"
      >
        <h2 className="text-sm font-semibold text-[var(--text)] leading-snug">
          Name your memory space
        </h2>
        <p className="mt-1.5 text-xs text-[var(--muted)] leading-relaxed">
          This sets your permanent workspace slug. It lives on your device and
          won&apos;t change after the first visit.
        </p>

        <div className="mt-4">
          <input
            ref={spaceNameInputRef}
            id="space-name"
            value={spaceNameDraft}
            onChange={(e) => {
              onSetSpaceNameDraft(e.target.value);
              if (spaceError) onClearSpaceError();
            }}
            placeholder="e.g. Intempt work journal"
            className="w-full text-xs bg-[var(--hover)] border border-[var(--border)] rounded-[8px] px-3 py-2.5 outline-none focus:border-[var(--accent)] focus:bg-[var(--panel)] text-[var(--text)] transition-colors placeholder:text-[var(--muted)]"
          />
        </div>

        {draftSlug && (
          <div className="mt-2 flex items-center gap-2 px-0.5">
            <span className="text-xs text-[var(--muted)]">Slug:</span>
            <code className="text-xs font-mono text-[var(--accent)]">
              /{draftSlug}
            </code>
          </div>
        )}

        {spaceError && (
          <p className="mt-2 text-xs text-red-500">{spaceError}</p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">
            Stored locally on this device
          </p>
          <button
            type="submit"
            disabled={!draftSlug}
            className="shrink-0 text-xs font-medium bg-[var(--text)] text-white px-4 py-2 rounded-[8px] hover:bg-[#2c2520] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create space
          </button>
        </div>
      </form>
    </div>
  );
}
