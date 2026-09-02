export type KitchenFlowStep = {
  id: string;
  label: string;
  actionLabel?: string;
};

export type KitchenFlow = KitchenFlowStep[];

export const DEFAULT_KITCHEN_FLOW: KitchenFlow = [
  { id: "new", label: "New", actionLabel: "Start preparing" },
  { id: "preparing", label: "Preparing", actionLabel: "Mark ready" },
  { id: "ready", label: "Ready", actionLabel: "Mark served" },
  { id: "served", label: "Served" },
];

export const KITCHEN_FLOW_PRESETS: {
  id: string;
  label: string;
  description: string;
  flow: KitchenFlow;
}[] = [
  {
    id: "standard",
    label: "4 steps",
    description: "New → Preparing → Ready → Served",
    flow: DEFAULT_KITCHEN_FLOW,
  },
  {
    id: "simple",
    label: "3 steps",
    description: "New → Ready → Served",
    flow: [
      { id: "new", label: "New", actionLabel: "Mark ready" },
      { id: "ready", label: "Ready", actionLabel: "Mark served" },
      { id: "served", label: "Served" },
    ],
  },
  {
    id: "minimal",
    label: "2 steps",
    description: "New → Done",
    flow: [
      { id: "new", label: "New", actionLabel: "Mark done" },
      { id: "done", label: "Done" },
    ],
  },
];

function isFlowStep(value: unknown): value is KitchenFlowStep {
  if (!value || typeof value !== "object") return false;
  const step = value as KitchenFlowStep;
  return typeof step.id === "string" && typeof step.label === "string";
}

export function parseKitchenFlow(raw: unknown): KitchenFlow {
  if (!Array.isArray(raw) || raw.length < 2) return DEFAULT_KITCHEN_FLOW;
  const steps = raw.filter(isFlowStep).map((step) => ({
    id: step.id.trim(),
    label: step.label.trim(),
    actionLabel: step.actionLabel?.trim() || undefined,
  }));
  return validateKitchenFlow(steps) === null ? steps : DEFAULT_KITCHEN_FLOW;
}

export function validateKitchenFlow(flow: KitchenFlow): string | null {
  if (flow.length < 2) return "At least 2 steps are required.";
  if (flow.length > 6) return "Maximum 6 steps allowed.";
  const ids = new Set<string>();
  for (const step of flow) {
    if (!step.label.trim()) return "Each step needs a name.";
    if (!step.id.trim() || !/^[a-z][a-z0-9_]*$/.test(step.id)) {
      return "Step ids must be lowercase letters, numbers, or underscores.";
    }
    if (ids.has(step.id)) return "Duplicate step ids are not allowed.";
    ids.add(step.id);
  }
  return null;
}

export function slugifyStepId(label: string, existing: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "step";
  let candidate = base;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = `${base}_${n}`;
    n += 1;
  }
  return candidate;
}

export function terminalStepId(flow: KitchenFlow): string {
  return flow[flow.length - 1]!.id;
}

export function activeStepIds(flow: KitchenFlow): string[] {
  return flow.slice(0, -1).map((s) => s.id);
}

export function isTerminalStatus(status: string | null, flow: KitchenFlow): boolean {
  if (!status) return false;
  return status === terminalStepId(flow);
}

export function isKnownStatus(status: string | null, flow: KitchenFlow): boolean {
  if (!status) return false;
  return flow.some((s) => s.id === status);
}

export function getStepMeta(flow: KitchenFlow, status: string) {
  const index = flow.findIndex((s) => s.id === status);
  if (index === -1) return null;
  const step = flow[index]!;
  const next = flow[index + 1] ?? null;
  return {
    label: step.label,
    nextId: next?.id ?? null,
    actionLabel:
      step.actionLabel ??
      (next ? `Mark ${next.label.toLowerCase()}` : null),
    index,
    isTerminal: index === flow.length - 1,
  };
}

/** Map an order status to the closest step when the flow changes. */
export function remapKitchenStatus(
  status: string | null,
  oldFlow: KitchenFlow,
  newFlow: KitchenFlow,
): string {
  if (!status) return newFlow[0]!.id;
  if (newFlow.some((s) => s.id === status)) return status;
  const oldIndex = oldFlow.findIndex((s) => s.id === status);
  if (oldIndex >= 0 && oldIndex < newFlow.length) return newFlow[oldIndex]!.id;
  return newFlow[0]!.id;
}

export function flowSummary(flow: KitchenFlow): string {
  return flow.map((s) => s.label).join(" → ");
}
