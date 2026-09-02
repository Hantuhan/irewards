import type { ProgramLanguage } from "@/lib/i18n/program-locale";

export type StorefrontCopy = {
  table: string;
  guest: string;
  pts: string;
  loadingMenu: string;
  shop: string;
  rewards: string;
  cart: string;
  profile: string;
  addToOrder: string;
  chooseOptions: string;
  addAnother: string;
  inCart: string;
  language: string;
  ingredients: string;
  notes: string;
  energy: string;
  sugar: string;
  tapAddHint: string;
};

const COPY: Record<ProgramLanguage, StorefrontCopy> = {
  en: {
    table: "Table",
    guest: "Guest",
    pts: "pts",
    loadingMenu: "Loading menu…",
    shop: "Shop",
    rewards: "iRewards",
    cart: "Cart",
    profile: "Profile",
    addToOrder: "Add to order",
    chooseOptions: "Choose options",
    addAnother: "Add another",
    inCart: "in cart",
    language: "Language",
    ingredients: "Ingredients",
    notes: "Notes",
    energy: "Energy",
    sugar: "Sugar",
    tapAddHint: "Tap add below to include this in your order.",
  },
  zh: {
    table: "桌号",
    guest: "访客",
    pts: "积分",
    loadingMenu: "加载菜单中…",
    shop: "点餐",
    rewards: "iRewards",
    cart: "购物车",
    profile: "我的",
    addToOrder: "加入订单",
    chooseOptions: "选择规格",
    addAnother: "再加一份",
    inCart: "已在购物车",
    language: "语言",
    ingredients: "成分",
    notes: "备注",
    energy: "热量",
    sugar: "糖分",
    tapAddHint: "点击下方加入订单。",
  },
  ms: {
    table: "Meja",
    guest: "Tetamu",
    pts: "mata",
    loadingMenu: "Memuatkan menu…",
    shop: "Menu",
    rewards: "iRewards",
    cart: "Troli",
    profile: "Profil",
    addToOrder: "Tambah pesanan",
    chooseOptions: "Pilih pilihan",
    addAnother: "Tambah lagi",
    inCart: "dalam troli",
    language: "Bahasa",
    ingredients: "Bahan",
    notes: "Nota",
    energy: "Tenaga",
    sugar: "Gula",
    tapAddHint: "Tekan tambah di bawah untuk masukkan pesanan.",
  },
};

export function storefrontCopy(lang: ProgramLanguage): StorefrontCopy {
  return COPY[lang];
}

export function storageKeyForStorefrontLang(merchantSlug: string) {
  return `irewards-storefront-lang-${merchantSlug}`;
}
