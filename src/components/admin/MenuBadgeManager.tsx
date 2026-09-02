"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import {
  BADGE_ICON_OPTIONS,
  DEFAULT_MENU_BADGES,
  slugifyBadgeId,
  type MenuBadge,
} from "@/lib/menu/menu-badges";

type MenuBadgeManagerProps = {
  merchantSlug: string;
  badges: MenuBadge[];
  onChange: (badges: MenuBadge[]) => void;
  onClose: () => void;
};

export function MenuBadgeManager({
  merchantSlug,
  badges,
  onChange,
  onClose,
}: MenuBadgeManagerProps) {
  const [draft, setDraft] = useState<MenuBadge[]>(badges);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  function updateBadge(id: string, patch: Partial<MenuBadge>) {
    setDraft((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBadge(id: string) {
    setDraft((prev) => prev.filter((b) => b.id !== id));
  }

  function addBadge() {
    const label = newLabel.trim();
    if (!label) return;
    setDraft((prev) => [
      ...prev,
      { id: slugifyBadgeId(label), label, icon: "star" },
    ]);
    setNewLabel("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await merchantApi<{ badges: MenuBadge[] }>(
        `/api/merchant/${merchantSlug}/menu/badges`,
        { method: "PUT", body: JSON.stringify({ badges: draft }) },
      );
      onChange(saved.badges);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save badges");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 border border-surface-container-highest bg-surface-container-lowest p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
            Customize badges
          </p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Rename presets or add your own. Badges appear on the diner menu and product sheet.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-on-surface-variant hover:text-primary"
          aria-label="Close badge manager"
        >
          <Icon name="close" />
        </button>
      </div>

      {error && (
        <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-body-md text-red-700">
          {error}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {draft.map((badge) => (
          <li
            key={badge.id}
            className="grid gap-3 border border-surface-container-highest p-4 sm:grid-cols-[1fr_140px_auto]"
          >
            <label className="block">
              <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
                Label
              </span>
              <input
                value={badge.label}
                onChange={(e) => updateBadge(badge.id, { label: e.target.value })}
                className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
                Icon
              </span>
              <select
                value={badge.icon}
                onChange={(e) => updateBadge(badge.id, { icon: e.target.value })}
                className="w-full border border-surface-container-highest bg-surface-container-lowest px-2 py-2"
              >
                {BADGE_ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={() => removeBadge(badge.id)}
                className="inline-flex items-center gap-1 border border-red-200 px-3 py-2 text-body-md text-red-700 hover:bg-red-50"
              >
                <Icon name="delete" className="text-[18px]" />
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-surface-container-highest pt-4">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block font-mono text-label-mono text-on-surface-variant">
            New badge
          </span>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Staff Favourite"
            className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={addBadge}
          disabled={!newLabel.trim()}
          className="border border-primary px-4 py-2 text-primary disabled:opacity-50"
        >
          Add badge
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-primary px-5 py-2.5 text-on-primary disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save badges"}
        </button>
        <button
          type="button"
          onClick={() => setDraft([...DEFAULT_MENU_BADGES])}
          className="border border-surface-container-highest px-4 py-2.5"
        >
          Reset to defaults
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 text-on-surface-variant">
          Cancel
        </button>
      </div>
    </div>
  );
}
