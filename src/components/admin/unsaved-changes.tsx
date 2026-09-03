"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type GuardRegistration = {
  isDirty: boolean;
  onSave: () => Promise<void>;
  onDiscard?: () => void;
};

type UnsavedChangesContextValue = {
  /** Sync check used by nav links before preventDefault. */
  isDirty: () => boolean;
  /** Register the active page's dirty state + save/discard handlers. */
  register: (reg: GuardRegistration | null) => void;
  /**
   * Run `action` now if clean; otherwise open “Save before leaving?”
   * Save → onSave then action. Don't save → onDiscard then action. Cancel → stay.
   */
  requestLeave: (action: () => void | Promise<void>) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const registrationRef = useRef<GuardRegistration | null>(null);
  const [pending, setPending] = useState<{ run: () => void | Promise<void> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const register = useCallback((reg: GuardRegistration | null) => {
    registrationRef.current = reg;
  }, []);

  const isDirty = useCallback(() => Boolean(registrationRef.current?.isDirty), []);

  const requestLeave = useCallback((action: () => void | Promise<void>) => {
    if (!registrationRef.current?.isDirty) {
      void action();
      return;
    }
    setDialogError(null);
    setPending({ run: action });
  }, []);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!registrationRef.current?.isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  async function handleSave() {
    if (!pending) return;
    const reg = registrationRef.current;
    if (!reg) return;
    setBusy(true);
    setDialogError(null);
    try {
      await reg.onSave();
      const action = pending.run;
      setPending(null);
      await action();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Could not save. Stay and fix, then try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleDiscard() {
    if (!pending) return;
    registrationRef.current?.onDiscard?.();
    const action = pending.run;
    setPending(null);
    void action();
  }

  const value = useMemo(
    () => ({ isDirty, register, requestLeave }),
    [isDirty, register, requestLeave],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      {pending ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-changes-title"
        >
          <div className="w-full max-w-md border border-surface-container-highest bg-surface-container-lowest p-6 shadow-xl">
            <p
              id="unsaved-changes-title"
              className="font-display text-headline-sm text-primary"
            >
              Save your changes?
            </p>
            <p className="mt-2 text-body-md text-on-surface-variant">
              You have unsaved edits. Save before leaving this page?
            </p>
            {dialogError ? (
              <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-body-md text-red-800">
                {dialogError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="bg-primary px-4 py-2.5 font-body-md text-on-primary disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDiscard}
                className="border border-surface-container-highest px-4 py-2.5 font-body-md disabled:opacity-60"
              >
                Don&apos;t save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPending(null);
                  setDialogError(null);
                }}
                className="px-4 py-2.5 font-body-md text-on-surface-variant underline disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  }
  return ctx;
}

/** Optional: pages outside AdminShell can no-op safely. */
export function useUnsavedChangesOptional() {
  return useContext(UnsavedChangesContext);
}

/**
 * Register dirty state for the current screen.
 * Call `requestLeave(fn)` before in-page exits (cancel, switch category, etc.).
 */
export function useUnsavedChangesGuard(options: {
  isDirty: boolean;
  onSave: () => Promise<void>;
  onDiscard?: () => void;
}) {
  const ctx = useUnsavedChangesOptional();
  const saveRef = useRef(options.onSave);
  const discardRef = useRef(options.onDiscard);
  saveRef.current = options.onSave;
  discardRef.current = options.onDiscard;

  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      isDirty: options.isDirty,
      onSave: () => saveRef.current(),
      onDiscard: () => discardRef.current?.(),
    });
    return () => ctx.register(null);
  }, [ctx, options.isDirty]);

  return {
    requestLeave: ctx?.requestLeave ?? ((action: () => void | Promise<void>) => void action()),
  };
}
