"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { tablePreviewRoute } from "@/lib/navigation/routes";

type DinerFlowPreviewProps = {
  merchantSlug: string;
};

type FlowKind = "first" | "return";

type FlowStep = {
  id: string;
  title: string;
  caption: string;
  screen: "qr" | "menu" | "item" | "cart" | "pay" | "thanks" | "welcome";
};

const FIRST_VISIT_STEPS: FlowStep[] = [
  {
    id: "scan",
    title: "Scan table QR",
    caption: "Diner sits down and scans the QR on the table. No app install or login.",
    screen: "qr",
  },
  {
    id: "menu",
    title: "Browse menu",
    caption: "Mobile storefront opens with your logo, categories, and live menu items.",
    screen: "menu",
  },
  {
    id: "item",
    title: "Customize item",
    caption: "Tap a dish to see details, modifiers, and add-ons before adding to cart.",
    screen: "item",
  },
  {
    id: "cart",
    title: "Review cart",
    caption: "Cart shows line items, service type, upsell suggestions, and order total.",
    screen: "cart",
  },
  {
    id: "pay",
    title: "Pay & send to kitchen",
    caption: "DuitNow, card, or e-wallet. Paid orders go straight to your kitchen board.",
    screen: "pay",
  },
  {
    id: "thanks",
    title: "Join iRewards",
    caption: "Thank-you screen invites diners to join on WhatsApp for +1 point and retention.",
    screen: "thanks",
  },
];

const RETURN_VISIT_STEPS: FlowStep[] = [
  {
    id: "scan",
    title: "Scan table QR",
    caption: "Same QR entry — cookie or phone match recognizes returning diners.",
    screen: "qr",
  },
  {
    id: "welcome",
    title: "Welcome back",
    caption: "Personalized header, tier badge, and “Your usual” one-tap reorder.",
    screen: "welcome",
  },
  {
    id: "cart",
    title: "Smart cart",
    caption: "Upsell when below usual spend; downsell swaps when items are unavailable.",
    screen: "cart",
  },
  {
    id: "pay",
    title: "Pay with points",
    caption: "Members can redeem points and apply promos before checkout.",
    screen: "pay",
  },
  {
    id: "thanks",
    title: "Points & retention",
    caption: "Points auto-credited. WhatsApp automations handle reviews and win-back.",
    screen: "thanks",
  },
];

function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[200px] overflow-hidden rounded-[1.75rem] border-[6px] border-on-surface/90 bg-on-surface shadow-lg">
        <div className="absolute left-1/2 top-1.5 z-10 h-1 w-12 -translate-x-1/2 rounded-full bg-on-surface/30" />
        <div className="flex min-h-[360px] flex-col bg-surface-container-lowest pt-5">
          {children}
        </div>
      </div>
      <span className="max-w-[200px] text-center font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">
        {label}
      </span>
    </div>
  );
}

function MiniNav({ active }: { active: "shop" | "rewards" | "cart" | "profile" }) {
  const tabs = [
    { id: "shop" as const, icon: "home", label: "Shop" },
    { id: "rewards" as const, icon: "confirmation_number", label: "Reward" },
    { id: "cart" as const, icon: "shopping_bag", label: "Cart" },
    { id: "profile" as const, icon: "person", label: "Profile" },
  ];
  return (
    <div className="mt-auto flex border-t border-surface-container-highest bg-surface px-1 py-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex flex-1 flex-col items-center gap-0.5 ${
            active === tab.id ? "font-bold text-primary" : "text-on-surface-variant"
          }`}
        >
          <Icon name={tab.icon} className="text-sm" />
          <span className="text-[8px]">{tab.label}</span>
        </div>
      ))}
    </div>
  );
}

function LiveStorefrontFrame({
  merchantSlug,
  asMember = false,
}: {
  merchantSlug: string;
  asMember?: boolean;
}) {
  const src = tablePreviewRoute(merchantSlug, "5", { embed: true, member: asMember });
  return (
    <iframe
      src={src}
      title={asMember ? "Live storefront — returning member" : "Live storefront menu"}
      className="h-full min-h-[320px] w-full border-0 bg-surface-container-lowest"
    />
  );
}

function ScreenMock({
  step,
  merchantSlug,
  asMember = false,
}: {
  step: FlowStep;
  merchantSlug: string;
  asMember?: boolean;
}) {
  switch (step.screen) {
    case "qr":
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center border-2 border-dashed border-primary bg-primary text-on-primary">
            <Icon name="qr_code_2" className="text-4xl text-primary" />
          </div>
          <p className="font-display text-headline-sm text-primary">Table 5</p>
          <p className="text-[10px] text-on-surface-variant">Scan to order</p>
        </div>
      );
    case "menu":
      return <LiveStorefrontFrame merchantSlug={merchantSlug} asMember={asMember} />;
    case "item":
      return (
        <>
          <div className="border-b border-surface-container-highest px-3 py-2">
            <p className="font-display text-[11px] font-bold text-primary">Latte</p>
            <p className="text-[9px] text-on-surface-variant">RM 12.00 · 250 kcal</p>
          </div>
          <div className="flex-1 space-y-2 px-3 py-2">
            <p className="font-mono text-[8px] uppercase text-on-surface-variant">Size</p>
            {["Regular", "Large +RM2"].map((opt, i) => (
              <div
                key={opt}
                className={`border px-2 py-1.5 text-[9px] ${
                  i === 0 ? "border-primary bg-primary text-on-primary" : "border-surface-container-highest"
                }`}
              >
                {opt}
              </div>
            ))}
            <p className="pt-1 font-mono text-[8px] uppercase text-on-surface-variant">Milk</p>
            {["Oat", "Full cream"].map((opt) => (
              <div key={opt} className="border border-surface-container-highest px-2 py-1.5 text-[9px]">
                {opt}
              </div>
            ))}
          </div>
          <div className="border-t border-surface-container-highest p-3">
            <div className="bg-primary py-2 text-center text-[10px] font-medium text-on-primary">
              Add to cart
            </div>
          </div>
        </>
      );
    case "welcome":
      return <LiveStorefrontFrame merchantSlug={merchantSlug} asMember />;
    case "cart":
      return (
        <>
          <div className="border-b border-surface-container-highest px-3 py-2">
            <p className="font-display text-[11px] font-bold text-primary">Your cart</p>
            <p className="text-[9px] text-on-surface-variant">Table 5</p>
          </div>
          <div className="flex-1 space-y-2 px-3 py-2">
            <div className="flex justify-between border-b border-surface-container-highest pb-2 text-[10px]">
              <span>Latte × 1</span>
              <span>RM 12.00</span>
            </div>
            <div className="rounded border border-dashed border-primary/40 bg-surface-container-low p-2 text-[9px] text-primary">
              ⬆️ Add a pastry? Complete your meal
            </div>
            <div className="flex justify-between pt-2 text-[11px] font-bold">
              <span>Total</span>
              <span>RM 12.00</span>
            </div>
          </div>
          <div className="border-t border-surface-container-highest p-3">
            <div className="bg-primary py-2 text-center text-[10px] font-medium text-on-primary">
              Checkout
            </div>
          </div>
          <MiniNav active="cart" />
        </>
      );
    case "pay":
      return (
        <>
          <div className="border-b border-surface-container-highest px-3 py-2">
            <p className="font-display text-[11px] font-bold text-primary">Payment</p>
            <p className="text-[9px] text-on-surface-variant">RM 12.00</p>
          </div>
          <div className="flex-1 space-y-2 px-3 py-3">
            {[
              { id: "duitnow", label: "DuitNow QR", active: true },
              { id: "card", label: "Card", active: false },
              { id: "wallet", label: "TNG eWallet", active: false },
            ].map((method) => (
              <div
                key={method.id}
                className={`flex items-center gap-2 border px-2 py-2 text-[10px] ${
                  method.active ? "border-primary bg-primary text-on-primary" : "border-surface-container-highest"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${method.active ? "bg-primary" : "bg-surface-container-highest"}`} />
                {method.label}
              </div>
            ))}
          </div>
          <div className="border-t border-surface-container-highest p-3">
            <div className="bg-primary py-2 text-center text-[10px] font-medium text-on-primary">
              Pay RM 12.00
            </div>
          </div>
        </>
      );
    case "thanks":
      return (
        <div className="flex flex-1 flex-col px-4 py-4">
          <div className="text-center">
            <Icon name="check_circle" className="text-3xl text-emerald-600" />
            <p className="mt-2 font-display text-[11px] font-bold text-primary">Order sent!</p>
            <p className="text-[9px] text-on-surface-variant">Kitchen is preparing your order</p>
          </div>
          <div className="mt-4 flex-1 rounded border border-surface-container-highest bg-surface-container-low p-3">
            <p className="font-mono text-[8px] uppercase text-on-surface-variant">Join iRewards</p>
            <p className="mt-1 text-[10px]">Get +1 point on WhatsApp 🎁</p>
            <div className="mt-3 flex gap-2">
              <span className="flex-1 border border-surface-container-highest py-1.5 text-center text-[9px]">
                Skip
              </span>
              <span className="flex-1 bg-primary py-1.5 text-center text-[9px] text-on-primary">
                Join
              </span>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function DinerFlowPreview({ merchantSlug }: DinerFlowPreviewProps) {
  const [flow, setFlow] = useState<FlowKind>("first");
  const [activeStep, setActiveStep] = useState(0);
  const steps = flow === "first" ? FIRST_VISIT_STEPS : RETURN_VISIT_STEPS;
  const step = steps[activeStep] ?? steps[0];
  const previewUrl = tablePreviewRoute(
    merchantSlug,
    "1",
    flow === "return" ? { member: true } : {},
  );

  function switchFlow(next: FlowKind) {
    setFlow(next);
    setActiveStep(0);
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-headline-sm text-primary">Diner storefront flow</h2>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            How guests experience your table QR menu — from scan to payment and iRewards join.
            Configure menu, checkout, and campaigns in other settings tabs.
          </p>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-primary px-4 py-2 font-display text-eyebrow uppercase text-primary hover:bg-primary/5"
        >
          <Icon name="open_in_new" className="text-base" />
          Open live preview
        </a>
      </div>

      <div className="mb-6 flex gap-1">
        {(
          [
            { id: "first" as const, label: "First-time visitor" },
            { id: "return" as const, label: "Return visitor" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => switchFlow(item.id)}
            className={`px-4 py-2 font-mono text-label-mono uppercase ${
              flow === item.id
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max items-start gap-3 px-1">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`rounded-sm transition-opacity ${
                    activeStep === index ? "opacity-100 ring-2 ring-primary ring-offset-2" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <PhoneFrame label={s.title}>
                    <ScreenMock
                      step={s}
                      merchantSlug={merchantSlug}
                      asMember={flow === "return"}
                    />
                  </PhoneFrame>
                </button>
                {index < steps.length - 1 && (
                  <div className="flex h-[360px] items-center pt-6">
                    <Icon name="arrow_forward" className="text-xl text-on-surface-variant" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="border border-surface-container-highest bg-surface-container-lowest p-5">
          <p className="font-mono text-label-mono uppercase text-on-surface-variant">
            Step {activeStep + 1} of {steps.length}
          </p>
          <h3 className="mt-2 font-display text-headline-sm text-primary">{step.title}</h3>
          <p className="mt-3 text-body-md text-on-surface-variant">{step.caption}</p>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((i) => Math.max(0, i - 1))}
              className="border border-surface-container-highest px-3 py-2 text-body-md disabled:opacity-40"
            >
              Previous step
            </button>
            <button
              type="button"
              disabled={activeStep >= steps.length - 1}
              onClick={() => setActiveStep((i) => Math.min(steps.length - 1, i + 1))}
              className="bg-primary px-3 py-2 text-body-md text-on-primary disabled:opacity-40"
            >
              Next step
            </button>
          </div>

          <p className="mt-6 text-body-md text-on-surface-variant">
            Table QR codes live in{" "}
            <Link href={`/dashboard/${merchantSlug}/tables`} className="text-primary underline">
              Table QR
            </Link>
            .
          </p>
        </aside>
      </div>
    </section>
  );
}
