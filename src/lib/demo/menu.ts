export type MenuCategory = "coffee" | "pastries" | "mains";

export const MENU_CATEGORIES: { id: MenuCategory; label: string }[] = [
  { id: "coffee", label: "Coffee" },
  { id: "pastries", label: "Pastries" },
  { id: "mains", label: "Mains" },
];

export const DEMO_MENU = [
  {
    id: "latte",
    name: "Oat Milk Latte",
    description: "Iced, less sweet. Smooth oat milk with double espresso.",
    priceCents: 1200,
    category: "coffee" as const,
  },
  {
    id: "pour-over",
    name: "Pour Over",
    description: "Single origin Ethiopia Yirgacheffe. Floral, bright acidity.",
    priceCents: 1400,
    category: "coffee" as const,
  },
  {
    id: "matcha",
    name: "Matcha Espresso",
    description: "Ceremonial grade matcha layered with espresso and milk.",
    priceCents: 1700,
    category: "coffee" as const,
  },
  {
    id: "croissant",
    name: "Butter Croissant",
    description: "Flaky, buttery layers baked fresh each morning.",
    priceCents: 800,
    category: "pastries" as const,
  },
  {
    id: "pain-au-chocolat",
    name: "Pain au Chocolat",
    description: "Dark chocolate batons in laminated pastry.",
    priceCents: 950,
    category: "pastries" as const,
  },
  {
    id: "sandwich",
    name: "Club Sandwich",
    description: "Grilled chicken, egg, lettuce, house mayo on sourdough.",
    priceCents: 1800,
    category: "mains" as const,
  },
] as const;

export type DemoMenuItem = (typeof DEMO_MENU)[number];
