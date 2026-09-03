"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  UnsavedChangesProvider,
  useUnsavedChanges,
} from "@/components/admin/unsaved-changes";
import {
  dashboardRoutes,
  type AdminSection,
} from "@/lib/navigation/routes";

type AdminShellProps = {
  merchantSlug: string;
  active: AdminSection;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  /** Fill viewport height — for kitchen board */
  layout?: "default" | "viewport";
  /** Hide page title header — for full-page chat */
  hideHeader?: boolean;
};

const SIDEBAR_STORAGE_KEY = "irewards-sidebar-expanded";
const SHELL_HEADER_HEIGHT = "min-h-[5.5rem]";

const navItems: { id: AdminSection; label: string; icon: string }[] = [
  { id: "orders", label: "Orders", icon: "assignment" },
  { id: "menu", label: "Menu", icon: "restaurant_menu" },
  { id: "customers", label: "Members", icon: "badge" },
  { id: "rewards", label: "IRewards", icon: "military_tech" },
  { id: "analytics", label: "Analytics", icon: "insert_chart" },
  { id: "reports", label: "Reports", icon: "summarize" },
  { id: "campaigns", label: "Campaigns", icon: "campaign" },
  { id: "tables", label: "Table QR", icon: "qr_code_2" },
  { id: "assistant", label: "AI Assistant", icon: "smart_toy" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function AdminShell(props: AdminShellProps) {
  return (
    <UnsavedChangesProvider>
      <AdminShellInner {...props} />
    </UnsavedChangesProvider>
  );
}

function AdminShellInner({
  merchantSlug,
  active,
  title,
  eyebrow = "Merchant dashboard",
  children,
  headerAction,
  layout = "default",
  hideHeader = false,
}: AdminShellProps) {
  const routes = dashboardRoutes(merchantSlug);
  const router = useRouter();
  const { isDirty, requestLeave } = useUnsavedChanges();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setSidebarExpanded(stored === "true");
    }
  }, []);

  function toggleSidebar() {
    setSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  function hrefFor(section: AdminSection) {
    if (section === "orders") return routes.home;
    return routes[section];
  }

  const navLink = (
    item: (typeof navItems)[number],
    options?: { collapsed?: boolean; onNavigate?: () => void },
  ) => {
    const collapsed = options?.collapsed ?? false;
    const isActive = active === item.id;
    const href = hrefFor(item.id);
    return (
      <Link
        key={item.id}
        href={href}
        onClick={(event) => {
          if (isActive) {
            options?.onNavigate?.();
            return;
          }
          if (!isDirty()) {
            options?.onNavigate?.();
            return;
          }
          event.preventDefault();
          requestLeave(() => {
            options?.onNavigate?.();
            router.push(href);
          });
        }}
        title={item.label}
        aria-label={item.label}
        className={`group/nav relative flex w-full min-h-11 items-center rounded-sm transition-colors ${
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 border-l-2 px-4 py-3"
        } ${
          isActive
            ? collapsed
              ? "bg-primary text-on-primary"
              : "border-primary bg-primary font-bold text-on-primary"
            : collapsed
              ? "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
        }`}
      >
        <Icon name={item.icon} className="pointer-events-none shrink-0 text-xl" filled={isActive} />
        {!collapsed && <span className="pointer-events-none truncate">{item.label}</span>}
        {collapsed && (
          <span
            role="tooltip"
            className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-[100] hidden -translate-y-1/2 whitespace-nowrap border border-surface-container-highest bg-surface-container-lowest px-3 py-2 font-display text-headline-sm text-primary shadow-md group-hover/nav:block"
          >
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div
      className={`flex bg-surface ${layout === "viewport" ? "h-screen overflow-hidden" : "min-h-screen"}`}
    >
      <aside
        className={`relative z-40 hidden shrink-0 flex-col border-r border-surface-container-highest bg-surface-container-lowest transition-[width] duration-200 ease-in-out md:flex ${
          sidebarExpanded ? "w-64" : "w-16"
        }`}
      >
        <div
          className={`flex shrink-0 flex-col border-b border-surface-container-highest ${
            sidebarExpanded ? "px-3" : "px-2"
          }`}
        >
          <div
            className={`flex items-center ${SHELL_HEADER_HEIGHT} ${
              sidebarExpanded ? "justify-between gap-2" : "justify-center"
            }`}
          >
            <div className={`flex min-w-0 items-center ${sidebarExpanded ? "gap-3" : "justify-center"}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-surface-container-highest bg-surface-container">
                <Icon name="storefront" className="text-primary" />
              </div>
              {sidebarExpanded && (
                <div className="min-w-0">
                  <h1 className="truncate font-display text-headline-sm font-bold text-primary">
                    {merchantSlug}
                  </h1>
                  <p className="mt-1 font-mono text-label-mono uppercase tracking-widest text-on-surface-variant">
                    Merchant SaaS
                  </p>
                </div>
              )}
            </div>
            {sidebarExpanded && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <Icon name="chevron_left" className="text-xl" />
              </button>
            )}
          </div>
          {!sidebarExpanded && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="mb-2 flex w-full min-h-11 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <Icon name="chevron_right" className="text-xl" />
            </button>
          )}
        </div>

        <nav className={`flex flex-1 flex-col gap-0.5 overflow-y-auto py-3 ${sidebarExpanded ? "px-3" : "px-2"}`}>
          {navItems.map((item) => navLink(item, { collapsed: !sidebarExpanded }))}
        </nav>

        <div
          className={`border-t border-surface-container-highest py-3 ${sidebarExpanded ? "space-y-1 px-3" : "space-y-1 px-2"}`}
        >
          <button
            type="button"
            onClick={() => {
              requestLeave(async () => {
                await fetch("/api/merchant/auth/login", {
                  method: "DELETE",
                  credentials: "include",
                });
                window.location.href = "/login";
              });
            }}
            title="Sign out"
            aria-label="Sign out"
            className={`flex w-full min-h-11 items-center text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary ${
              sidebarExpanded ? "gap-3 px-4 py-2" : "justify-center px-0 py-2.5"
            }`}
          >
            <Icon name="logout" className="pointer-events-none shrink-0 text-lg" />
            {sidebarExpanded && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden admin-manus">
        <div className="flex items-center justify-between border-b border-surface-container-highest bg-surface-container-lowest px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex items-center gap-2 font-display text-headline-sm text-primary"
            aria-label="Open navigation"
          >
            <Icon name="menu" className="text-2xl" />
            Menu
          </button>
          <span className="font-mono text-label-mono uppercase text-on-surface-variant">
            {merchantSlug}
          </span>
        </div>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside
              className="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface-container-lowest py-6 shadow-xl"
              style={{ ["--color-primary" as string]: "#000000" }}
            >
              <div className="mb-4 flex items-center justify-between px-4">
                <p className="font-display text-headline-sm font-bold text-primary">Dashboard</p>
                <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close">
                  <Icon name="close" className="text-2xl text-on-surface-variant" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
                {navItems.map((item) => navLink(item, { onNavigate: () => setMobileNavOpen(false) }))}
              </nav>
            </aside>
          </div>
        )}

        {!hideHeader && (
        <header
          className={`flex shrink-0 items-center justify-between gap-4 border-b border-surface-container-highest bg-surface-container-lowest px-6 md:px-8 ${SHELL_HEADER_HEIGHT}`}
        >
          <div className="min-w-0 flex-1">
            <p className="font-display text-eyebrow uppercase tracking-widest text-on-surface-variant">
              {eyebrow}
            </p>
            <h1 className="truncate font-display text-headline-md text-primary">{title}</h1>
          </div>
          {headerAction ? (
            <div className="flex shrink-0 flex-nowrap items-center gap-2">{headerAction}</div>
          ) : null}
        </header>
        )}
        <main
          className={
            layout === "viewport"
              ? hideHeader
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : "flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6"
              : "flex-1 p-6 md:p-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
