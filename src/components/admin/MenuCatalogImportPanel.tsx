"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { merchantApi } from "@/lib/merchant/fetch";
import type { CatalogTemplateSummary } from "@/lib/menu/catalog-templates/types";
import type { CatalogImportResult } from "@/lib/db/catalog-import";

type MenuCatalogImportPanelProps = {
  merchantSlug: string;
  onClose: () => void;
  onImported: (result: CatalogImportResult) => void;
};

/** Lets a merchant import a ready-made catalog (categories, products, photos, modifiers). */
export function MenuCatalogImportPanel({
  merchantSlug,
  onClose,
  onImported,
}: MenuCatalogImportPanelProps) {
  const [templates, setTemplates] = useState<CatalogTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    merchantApi<{ templates: CatalogTemplateSummary[] }>(
      `/api/merchant/${merchantSlug}/menu/import-template`,
    )
      .then((data) => setTemplates(data.templates ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load catalogs"))
      .finally(() => setLoading(false));
  }, [merchantSlug]);

  async function runImport(templateId: string) {
    setImporting(templateId);
    setError(null);
    try {
      const result = await merchantApi<CatalogImportResult>(
        `/api/merchant/${merchantSlug}/menu/import-template`,
        { method: "POST", body: JSON.stringify({ templateId }) },
      );
      onImported(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(null);
      setConfirming(null);
    }
  }

  return (
    <section className="mb-6 border border-surface-container-highest bg-surface-container-lowest">
      <div className="flex items-start justify-between gap-4 border-b border-surface-container-highest px-5 py-4">
        <div>
          <p className="font-display text-[15px] font-semibold text-primary">Import a catalog</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-on-surface-variant">
            Adds categories and fully-built products (photo, detail page, customisations,
            allergens, pairings). Products are matched by slug, so re-importing updates them and
            never deletes anything else.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-surface-container-highest text-on-surface-variant hover:text-primary"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-body-md text-on-surface-variant">Loading catalogs…</p>
        ) : templates.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No catalog templates available.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => {
              const busy = importing === template.id;
              const confirm = confirming === template.id;
              return (
                <article
                  key={template.id}
                  className="flex flex-col border border-surface-container-highest bg-surface"
                >
                  {template.previewImageUrls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-px bg-surface-container-highest">
                      {template.previewImageUrls.slice(0, 6).map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <p className="font-display text-[15px] font-semibold text-primary">
                        {template.name}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-on-surface-variant">
                        {template.description}
                      </p>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                      {template.categoryCount} categories · {template.productCount} products
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {confirm ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runImport(template.id)}
                            className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 font-display text-[13px] font-semibold text-on-primary disabled:opacity-50"
                          >
                            <Icon name={busy ? "hourglass_top" : "download"} className="text-[18px]" />
                            {busy ? "Importing…" : `Confirm import (${template.productCount})`}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirming(null)}
                            className="border border-surface-container-highest px-3 py-2 text-[13px] text-on-surface-variant"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(template.id)}
                          className="inline-flex items-center gap-1.5 border border-primary px-4 py-2 font-display text-[13px] font-semibold text-primary"
                        >
                          <Icon name="download" className="text-[18px]" />
                          Import catalog
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {error ? (
          <p className="mt-4 text-body-md text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
