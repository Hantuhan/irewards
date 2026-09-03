import { formatDecimal, formatMultiplier } from "@/lib/format/number";

export type ProgramLanguage = "en" | "zh" | "ms";

export const PROGRAM_LANGUAGES: { code: ProgramLanguage; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "zh", label: "Chinese", short: "中文" },
  { code: "ms", label: "Bahasa Malaysia", short: "BM" },
];

export type LocalizedMap = Partial<Record<ProgramLanguage, string>>;

export function resolveLocalized(
  map: LocalizedMap | null | undefined,
  lang: ProgramLanguage,
  fallback: string,
): string {
  if (map?.[lang]?.trim()) return map[lang]!.trim();
  if (map?.en?.trim()) return map.en.trim();
  return fallback;
}

export function withLocalized(
  map: LocalizedMap | null | undefined,
  lang: ProgramLanguage,
  value: string,
): LocalizedMap {
  return { ...map, [lang]: value };
}

/** Default tier names & perks for new merchants (by level number). */
export const DEFAULT_TIER_COPY: Record<
  number,
  { name: LocalizedMap; perk: LocalizedMap }
> = {
  1: {
    name: { en: "Starter", zh: "入门", ms: "Permulaan" },
    perk: { en: "Welcome to iRewards", zh: "欢迎加入 iRewards", ms: "Selamat datang ke iRewards" },
  },
  2: {
    name: { en: "Bronze", zh: "青铜", ms: "Gangsa" },
    perk: {
      en: "Free coffee\nFree topping upgrade",
      zh: "免费咖啡\n免费加料升级",
      ms: "Kopi percuma\nNaik taraf topping percuma",
    },
  },
  3: {
    name: { en: "Silver", zh: "白银", ms: "Perak" },
    perk: {
      en: "Birthday drink\nFree pastry once a month",
      zh: "生日饮品\n每月免费糕点一次",
      ms: "Minuman hari jadi\nPastri percuma sebulan sekali",
    },
  },
  4: {
    name: { en: "Gold", zh: "黄金", ms: "Emas" },
    perk: {
      en: "Priority queue\nFree size upgrade\nMystery gift monthly",
      zh: "优先排队\n免费加大杯\n每月神秘礼物",
      ms: "Barisan keutamaan\nNaik saiz percuma\nHadiah misteri bulanan",
    },
  },
  5: {
    name: { en: "Platinum", zh: "铂金", ms: "Platinum" },
    perk: {
      en: "Exclusive seasonal menu\nFree drink every month\nBring-a-friend free drink",
      zh: "专属季节菜单\n每月免费饮品\n带朋友免费一杯",
      ms: "Menu musim eksklusif\nMinuman percuma setiap bulan\nBawa kawan minuman percuma",
    },
  },
};

export function defaultTierName(levelNumber: number, lang: ProgramLanguage): string {
  return DEFAULT_TIER_COPY[levelNumber]?.name[lang] ?? DEFAULT_TIER_COPY[levelNumber]?.name.en ?? "Tier";
}

export function defaultTierPerk(levelNumber: number, lang: ProgramLanguage): string {
  return DEFAULT_TIER_COPY[levelNumber]?.perk[lang] ?? DEFAULT_TIER_COPY[levelNumber]?.perk.en ?? "";
}

type RewardsAdminCopy = {
  copilotTitle: string;
  copilotSubtitle: string;
  earnLabel: string;
  redeemLabel: string;
  whyTitle: string;
  tierRatesTitle: string;
  redemptionTitle: string;
  applySetup: string;
  higherEarn: string;
  lowerEarn: string;
  ptsPerRm: string;
  ptsEquals: string;
  programLanguage: string;
  programLanguageHint: string;
  tierName: string;
  tierPerk: string;
  editingIn: string;
};

const ADMIN_COPY: Record<ProgramLanguage, RewardsAdminCopy> = {
  en: {
    copilotTitle: "Program assistant",
    copilotSubtitle: "Same Collecting & using + Levels setup as the iRewards guide — customise anything",
    earnLabel: "How fast they earn",
    redeemLabel: "What a point is worth",
    whyTitle: "Why this works",
    tierRatesTitle: "Points per RM by level",
    redemptionTitle: "What members can spend points on",
    applySetup: "Use this setup",
    higherEarn: "Faster rewards",
    lowerEarn: "Slower rewards (protect margin)",
    ptsPerRm: "pts per RM 1",
    ptsEquals: "pts =",
    programLanguage: "Program language",
    programLanguageHint: "Edit level names and benefits shown to diners in each language.",
    tierName: "Level name",
    tierPerk: "Member benefit",
    editingIn: "Editing in",
  },
  zh: {
    copilotTitle: "方案助手",
    copilotSubtitle: "与会员向导 / Collecting & using 相同的积分设置，可随时调整",
    earnLabel: "赚取比例",
    redeemLabel: "兑换示例",
    whyTitle: "为什么推荐",
    tierRatesTitle: "各等级每 RM 积分",
    redemptionTitle: "会员可兑换",
    applySetup: "采用此方案",
    higherEarn: "提高赚取",
    lowerEarn: "降低赚取（保护利润）",
    ptsPerRm: "积分 / RM 1",
    ptsEquals: "积分 =",
    programLanguage: "方案语言",
    programLanguageHint: "按语言编辑会员看到的等级名称与福利说明。",
    tierName: "等级名称",
    tierPerk: "会员福利",
    editingIn: "正在编辑",
  },
  ms: {
    copilotTitle: "Pembantu program",
    copilotSubtitle: "Sama seperti panduan iRewards / Collecting & using — boleh ubah",
    earnLabel: "Kadar mata",
    redeemLabel: "Contoh tebusan",
    whyTitle: "Mengapa ini berkesan",
    tierRatesTitle: "Mata setiap RM mengikut tier",
    redemptionTitle: "Apa ahli boleh tebus",
    applySetup: "Guna tetapan ini",
    higherEarn: "Mata lebih tinggi",
    lowerEarn: "Mata lebih rendah (jaga margin)",
    ptsPerRm: "mata setiap RM 1",
    ptsEquals: "mata =",
    programLanguage: "Bahasa program",
    programLanguageHint: "Edit nama tier dan faedah untuk pelanggan dalam setiap bahasa.",
    tierName: "Nama tier",
    tierPerk: "Faedah ahli",
    editingIn: "Mengedit dalam",
  },
};

export function rewardsAdminCopy(lang: ProgramLanguage): RewardsAdminCopy {
  return ADMIN_COPY[lang];
}

export function copilotBullets(
  lang: ProgramLanguage,
  baseRate: number,
  topMultiplier: number,
  topTierName: string,
): string[] {
  const rate = formatDecimal(baseRate);
  const multiplier = formatMultiplier(topMultiplier);
  const bullets: Record<ProgramLanguage, string[]> = {
    en: [
      `Members earn ${rate} pt per RM 1 on every order — easy to understand.`,
      `${topTierName} earns up to ${multiplier}× more points to reward regulars.`,
      "Redemption examples show real RM value members get at checkout.",
    ],
    zh: [
      `每笔订单赚取 ${rate} 积分/RM — 规则简单易懂。`,
      `${topTierName} 最高可享 ${multiplier}× 积分，回馈常客。`,
      "兑换示例展示结账时可抵扣的实际金额。",
    ],
    ms: [
      `Ahli dapat ${rate} mata setiap RM 1 — mudah difahami.`,
      `${topTierName} boleh dapat sehingga ${multiplier}× mata untuk pelanggan setia.`,
      "Contoh tebusan menunjukkan nilai RM sebenar semasa bayar.",
    ],
  };
  return bullets[lang];
}
