"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { MenuItemAvailabilityEditor } from "@/components/admin/MenuItemAvailabilityEditor";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import {
  buildWeeklySchedule,
  extractWeeklyUi,
  formatAvailabilitySummary,
  parseTagsInput,
  tagsToInput,
  toDatetimeLocalValue,
  type AvailabilityMode,
  type WeeklySchedule,
  type WeekdayKey,
} from "@/lib/menu/availability";

type MenuAdminShellProps = { merchantSlug: string };

type MenuItem = {
  slug: string;
  categorySlug: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  imageUrl: string | null;
  tags: string[];
  availabilityMode: AvailabilityMode;
  availabilityWeekly: WeeklySchedule | null;
  availableFrom: string | null;
  availableUntil: string | null;
};

type Category = { slug: string; label: string };

function newItemDraft(categorySlug: string): MenuItem {
  return {
    slug: `item-${Date.now()}`,
    categorySlug,
    name: "",
    description: "",
    priceCents: 0,
    active: true,
    imageUrl: null,
    tags: [],
    availabilityMode: "always",
    availabilityWeekly: null,
    availableFrom: null,
    availableUntil: null,
  };
}

export function MenuAdminShell({ merchantSlug }: MenuAdminShellProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>("always");
  const [weeklyDays, setWeeklyDays] = useState<WeekdayKey[]>([]);
  const [weeklyStart, setWeeklyStart] = useState("09:00");
  const [weeklyEnd, setWeeklyEnd] = useState("22:00");
  const [availableFromLocal, setAvailableFromLocal] = useState("");
  const [availableUntilLocal, setAvailableUntilLocal] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi<{ categories: Category[]; items: MenuItem[] }>(
        `/api/merchant/${merchantSlug}/menu`,
      );
      setCategories(data.categories);
      setItems(
        data.items.map((item) => ({
          ...item,
          imageUrl: item.imageUrl ?? null,
          tags: item.tags ?? [],
          availabilityMode: item.availabilityMode ?? "always",
          availabilityWeekly: item.availabilityWeekly ?? null,
          availableFrom: item.availableFrom ?? null,
          availableUntil: item.availableUntil ?? null,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [merchantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryLabelBySlug = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.label])),
    [categories],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterCategory !== "all" && item.categorySlug !== filterCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q))
      );
    });
  }, [items, filterCategory, search]);

  const isNewItem = editing?.slug.startsWith("item-") ?? false;
  const defaultCategory = filterCategory !== "all" ? filterCategory : categories[0]?.slug ?? "";

  async function persistItem(item: MenuItem, useFormFields = false) {
    let payload = { ...item };

    if (useFormFields) {
      payload = {
        ...payload,
        tags: parseTagsInput(tagsInput),
        availabilityMode,
        availabilityWeekly:
          availabilityMode === "weekly"
            ? buildWeeklySchedule(weeklyDays, weeklyStart, weeklyEnd)
            : null,
        availableFrom:
          availabilityMode === "date_range" && availableFromLocal
            ? new Date(availableFromLocal).toISOString()
            : null,
        availableUntil:
          availabilityMode === "date_range" && availableUntilLocal
            ? new Date(availableUntilLocal).toISOString()
            : null,
      };
      if (availabilityMode !== "weekly") payload.availabilityWeekly = null;
      if (availabilityMode !== "date_range") {
        payload.availableFrom = null;
        payload.availableUntil = null;
      }
      if (availabilityMode === "always") {
        payload.availabilityWeekly = null;
        payload.availableFrom = null;
        payload.availableUntil = null;
      }
    }

    await merchantApi(`/api/merchant/${merchantSlug}/menu`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async function saveItem(item: MenuItem) {
    await persistItem(item, true);
    setEditing(null);
    await load();
  }

  async function toggleActive(item: MenuItem) {
    await persistItem({ ...item, active: !item.active });
    await load();
  }

  function openEditor(item: MenuItem) {
    setEditing(item);
    setTagsInput(tagsToInput(item.tags));
    setAvailabilityMode(item.availabilityMode);
    const weekly = extractWeeklyUi(item.availabilityWeekly);
    setWeeklyDays(weekly.days);
    setWeeklyStart(weekly.start);
    setWeeklyEnd(weekly.end);
    setAvailableFromLocal(toDatetimeLocalValue(item.availableFrom));
    setAvailableUntilLocal(toDatetimeLocalValue(item.availableUntil));
  }

  function openNewEditor() {
    const draft = newItemDraft(defaultCategory);
    setEditing(draft);
    setTagsInput("");
    setAvailabilityMode("always");
    setWeeklyDays(["mon", "tue", "wed", "thu", "fri"]);
    setWeeklyStart("09:00");
    setWeeklyEnd("22:00");
    setAvailableFromLocal("");
    setAvailableUntilLocal("");
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    const label = newCategoryLabel.trim();
    if (!label) return;

    setSavingCategory(true);
    setError(null);
    try {
      const created = await merchantApi<{ slug: string; label: string }>(
        `/api/merchant/${merchantSlug}/menu/categories`,
        { method: "POST", body: JSON.stringify({ label }) },
      );
      setNewCategoryLabel("");
      setShowCategoryManager(false);
      await load();
      setFilterCategory(created.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!editing) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/merchant/${merchantSlug}/menu/upload`, {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Upload failed");
      setEditing({ ...editing, imageUrl: json.url ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function startAddProduct() {
    if (!defaultCategory) {
      setShowCategoryManager(true);
      return;
    }
    openNewEditor();
  }

  return (
    <AdminShell
      merchantSlug={merchantSlug}
      active="menu"
      title="Menu & product management"
      eyebrow="Catalog"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-col gap-6 border-b border-surface-container-highest pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="max-w-2xl text-body-md text-on-surface-variant">
              Organize offerings, upload product photos, and control what appears on the diner
              storefront.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowCategoryManager((v) => !v)}
              className={`inline-flex items-center gap-2 border px-5 py-2.5 font-body-md font-medium transition-colors ${
                showCategoryManager
                  ? "border-primary bg-surface-container-low text-primary"
                  : "border-primary text-primary hover:bg-surface-container-low"
              }`}
            >
              <Icon name="category" className="text-[18px]" />
              Manage categories
            </button>
            <button
              type="button"
              onClick={startAddProduct}
              disabled={categories.length === 0}
              className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 font-body-md font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="add" className="text-[18px]" />
              Add new product
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-body-md text-red-800">
            {error}
          </div>
        )}

        {loading && <p className="text-body-md text-on-surface-variant">Loading menu…</p>}

        {!loading && categories.length === 0 && (
          <div className="border border-surface-container-highest bg-surface-container-lowest px-8 py-12 text-center">
            <p className="font-display text-headline-sm text-primary">Start with a category</p>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Create Coffee, Pastries, or Mains — then add products with photos.
            </p>
            <button
              type="button"
              onClick={() => setShowCategoryManager(true)}
              className="mt-6 inline-flex items-center gap-2 bg-primary px-5 py-2.5 font-display text-headline-sm text-on-primary"
            >
              <Icon name="add" />
              Create first category
            </button>
          </div>
        )}

        {showCategoryManager && (
          <form
            onSubmit={saveCategory}
            className="mb-6 border border-surface-container-highest bg-surface-container-lowest p-6"
          >
            <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              New category
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="min-w-[220px] flex-1">
                <span className="mb-1.5 block font-mono text-label-mono text-on-surface-variant">
                  Category name
                </span>
                <input
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="e.g. Coffee"
                  className="w-full border-0 border-b border-surface-container-highest bg-transparent px-0 py-2 focus:border-primary focus:outline-none focus:ring-0"
                  required
                  autoFocus
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="bg-primary px-4 py-2 text-on-primary disabled:opacity-60"
                >
                  {savingCategory ? "Saving…" : "Save category"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryManager(false);
                    setNewCategoryLabel("");
                  }}
                  className="border border-surface-container-highest px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {!loading && categories.length > 0 && (
          <>
            <div className="mb-6 border border-surface-container-highest bg-surface-container-lowest p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="relative w-full shrink-0 lg:w-80">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search menu items…"
                    className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-0"
                  />
                </div>

                <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 lg:border-l lg:border-surface-container-highest lg:pl-6">
                  <button
                    type="button"
                    onClick={() => setFilterCategory("all")}
                    className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-1 font-body-md transition-colors ${
                      filterCategory === "all"
                        ? "border-primary text-primary"
                        : "border-transparent text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    All items
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setFilterCategory(cat.slug)}
                      className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-1 font-body-md transition-colors ${
                        filterCategory === cat.slug
                          ? "border-primary text-primary"
                          : "border-transparent text-on-surface-variant hover:text-primary"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                  <div className="ml-2 flex shrink-0 items-center border-l border-outline-variant pl-4">
                    <button
                      type="button"
                      onClick={() => setShowCategoryManager(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1 text-on-surface-variant transition-colors hover:text-primary"
                    >
                      <Icon name="add_circle" className="text-[18px]" />
                      <span className="font-body-md">New category</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {editing && (
              <form
                className="mb-6 border border-surface-container-highest bg-surface-container-low p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveItem(editing);
                }}
              >
                <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                  {isNewItem ? "New product" : "Edit product"}
                </p>

                <div className="mt-6 grid gap-6 lg:grid-cols-[140px_1fr]">
                  <div>
                    <p className="mb-2 font-mono text-label-mono text-on-surface-variant">Photo</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="relative flex h-[120px] w-[120px] items-center justify-center border border-surface-container-highest bg-surface-container-lowest"
                    >
                      {editing.imageUrl ? (
                        <Image
                          src={editing.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                          <Icon name="add_photo_alternate" className="text-2xl" />
                          <span className="font-mono text-[10px] uppercase">Upload</span>
                        </div>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto(file);
                        e.target.value = "";
                      }}
                    />
                    {uploadingPhoto && (
                      <p className="mt-2 font-mono text-label-mono text-on-surface-variant">
                        Uploading…
                      </p>
                    )}
                    {editing.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, imageUrl: null })}
                        className="mt-2 font-mono text-label-mono text-on-surface-variant underline"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Product name
                      </span>
                      <input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                        required
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Category
                      </span>
                      <select
                        value={editing.categorySlug}
                        onChange={(e) =>
                          setEditing({ ...editing, categorySlug: e.target.value })
                        }
                        className="w-full border border-surface-container-highest bg-surface-container-lowest px-3 py-2"
                      >
                        {categories.map((cat) => (
                          <option key={cat.slug} value={cat.slug}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Price (sen)
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={editing.priceCents}
                        onChange={(e) =>
                          setEditing({ ...editing, priceCents: Number(e.target.value) })
                        }
                        className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 font-mono focus:border-primary focus:outline-none"
                        required
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Description
                      </span>
                      <input
                        value={editing.description ?? ""}
                        onChange={(e) =>
                          setEditing({ ...editing, description: e.target.value })
                        }
                        className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
                        Tags
                      </span>
                      <input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="vegan, bestseller, spicy (comma separated)"
                        className="w-full border-0 border-b border-surface-container-highest bg-transparent py-2 focus:border-primary focus:outline-none"
                      />
                    </label>
                    <MenuItemAvailabilityEditor
                      mode={availabilityMode}
                      weeklyDays={weeklyDays}
                      weeklyStart={weeklyStart}
                      weeklyEnd={weeklyEnd}
                      availableFrom={availableFromLocal}
                      availableUntil={availableUntilLocal}
                      onModeChange={setAvailabilityMode}
                      onWeeklyDaysChange={setWeeklyDays}
                      onWeeklyStartChange={setWeeklyStart}
                      onWeeklyEndChange={setWeeklyEnd}
                      onAvailableFromChange={setAvailableFromLocal}
                      onAvailableUntilChange={setAvailableUntilLocal}
                    />
                    <label className="flex items-center gap-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={editing.active}
                        onChange={(e) =>
                          setEditing({ ...editing, active: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-body-md">Live on storefront</span>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button type="submit" className="bg-primary px-5 py-2.5 text-on-primary">
                    {isNewItem ? "Add product" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="border border-surface-container-highest px-5 py-2.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-hidden border border-surface-container-highest bg-surface-container-lowest">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-surface-container-highest bg-surface">
                      {["Product", "Tags", "Availability", "Price", "Status", ""].map((col) => (
                        <th
                          key={col}
                          className="px-6 py-4 font-display text-eyebrow uppercase tracking-widest text-on-surface-variant"
                        >
                          {col}
                        </th>
                      ))}
                  </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-body-md text-on-surface-variant"
                        >
                          No products match your filters.
                          <button
                            type="button"
                            onClick={startAddProduct}
                            className="ml-2 underline hover:text-primary"
                          >
                            Add one
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr
                          key={item.slug}
                          className="border-b border-surface-container-highest transition-colors hover:bg-surface-container-low"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative h-12 w-12 shrink-0 border border-surface-container-highest bg-surface-container-low">
                                {item.imageUrl ? (
                                  <Image
                                    src={item.imageUrl}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                                    <Icon name="image_not_supported" className="text-xl opacity-60" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-display text-headline-sm text-primary">
                                  {item.name}
                                </p>
                                <p className="mt-1 font-mono text-label-mono text-on-surface-variant">
                                  {categoryLabelBySlug.get(item.categorySlug) ?? item.categorySlug}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {item.tags.length === 0 ? (
                                <span className="text-body-md text-on-surface-variant">—</span>
                              ) : (
                                item.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="border border-surface-container-highest bg-surface-container-low px-2 py-0.5 font-mono text-[11px] text-on-surface"
                                  >
                                    {tag}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="max-w-[200px] px-6 py-4 font-mono text-label-mono text-on-surface-variant">
                            {formatAvailabilitySummary(item)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-label-mono">
                            RM {(item.priceCents / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={item.active}
                              onClick={() => toggleActive(item)}
                              className={`inline-flex h-4 w-8 items-center border transition-colors ${
                                item.active
                                  ? "border-primary bg-primary"
                                  : "border-surface-container-highest bg-surface-container-highest"
                              }`}
                            >
                              <span
                                className={`h-3 w-3 bg-surface-container-lowest transition-transform ${
                                  item.active ? "translate-x-4 border border-primary" : "translate-x-0.5 border border-on-surface"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openEditor(item)}
                              className="text-on-surface-variant hover:text-primary"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Icon name="edit" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-surface-container-highest px-6 py-3 font-mono text-label-mono text-on-surface-variant">
                <span>
                  {filteredItems.length} of {items.length} products
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
