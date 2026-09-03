import type { ProgramLanguage } from "@/lib/i18n/program-locale";

export type StorefrontCopy = {
  table: string;
  guest: string;
  pts: string;
  /** Singular form, for exactly one point. */
  pt: string;
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
  allergens: string;
  notes: string;
  energy: string;
  sugar: string;
  tapAddHint: string;
  productDetails: string;
  dineIn: string;
  takeaway: string;
  nettPrice: string;
  required: string;
  optional: string;
  standard: string;
  included: string;
  upTo: string;
  pickExactly: string;
  frequentlyPairedWith: string;
  add: string;
  added: string;
  kitchenNotes: string;
  kitchenNotesPlaceholder: string;
  kitchenNotesHint: string;
  earnsPoints: string;
  joinToEarn: string;
  earnOnThisOrder: string;
  joinToClaimPoints: string;
  onThisOrder: string;
  pointsAfterPayment: string;
  backToMenu: string;
  productUnavailable: string;
  viewCart: string;
};

const COPY: Record<ProgramLanguage, StorefrontCopy> = {
  en: {
    table: "Table",
    guest: "Guest",
    pts: "pts",
    pt: "pt",
    loadingMenu: "Loading menu…",
    shop: "Shop",
    rewards: "Rewards",
    cart: "Cart",
    profile: "Profile",
    addToOrder: "Add to order",
    chooseOptions: "Choose options",
    addAnother: "Add another",
    inCart: "in cart",
    language: "Language",
    ingredients: "What's in it",
    allergens: "Allergens & diet",
    notes: "Notes",
    energy: "Energy",
    sugar: "Sugar",
    tapAddHint: "Tap add below to include this in your order.",
    productDetails: "Product Details",
    dineIn: "Dine-in",
    takeaway: "Takeaway",
    nettPrice: "Nett price · Tax inc.",
    required: "Required",
    optional: "Optional",
    standard: "Standard",
    included: "Included",
    upTo: "Up to",
    pickExactly: "Pick",
    frequentlyPairedWith: "Frequently paired with",
    add: "Add",
    added: "Added",
    kitchenNotes: "Kitchen & barista notes",
    kitchenNotesPlaceholder: "Special request (e.g. less ice, sauce on the side, allergy alert)…",
    kitchenNotesHint: "We will do our best to accommodate dietary or serving preferences.",
    earnsPoints: "Earns iRewards points",
    joinToEarn: "Join to earn points",
    earnOnThisOrder: "You'll earn",
    joinToClaimPoints: "Join on WhatsApp after paying to claim",
    onThisOrder: "on this order.",
    pointsAfterPayment: "Credited once payment is confirmed.",
    backToMenu: "Back to menu",
    productUnavailable: "This product is not available right now.",
    viewCart: "View cart",
  },
  zh: {
    table: "桌号",
    guest: "访客",
    pts: "积分",
    pt: "积分",
    loadingMenu: "加载菜单中…",
    shop: "点餐",
    rewards: "奖励",
    cart: "购物车",
    profile: "我的",
    addToOrder: "加入订单",
    chooseOptions: "选择规格",
    addAnother: "再加一份",
    inCart: "已在购物车",
    language: "语言",
    ingredients: "食材",
    allergens: "过敏原与饮食",
    notes: "备注",
    energy: "热量",
    sugar: "糖分",
    tapAddHint: "点击下方加入订单。",
    productDetails: "商品详情",
    dineIn: "堂食",
    takeaway: "外带",
    nettPrice: "净价 · 含税",
    required: "必选",
    optional: "可选",
    standard: "标准",
    included: "已包含",
    upTo: "最多",
    pickExactly: "选择",
    frequentlyPairedWith: "常见搭配",
    add: "添加",
    added: "已添加",
    kitchenNotes: "厨房与咖啡师备注",
    kitchenNotesPlaceholder: "特殊要求（例如少冰、酱料分开、过敏提醒）…",
    kitchenNotesHint: "我们将尽力满足您的饮食或上菜偏好。",
    earnsPoints: "可赚取 iRewards 积分",
    joinToEarn: "加入即可赚取积分",
    earnOnThisOrder: "本次可得",
    joinToClaimPoints: "付款后在 WhatsApp 加入即可领取",
    onThisOrder: "本次订单积分。",
    pointsAfterPayment: "付款确认后入账。",
    backToMenu: "返回菜单",
    productUnavailable: "此商品目前暂不供应。",
    viewCart: "查看购物车",
  },
  ms: {
    table: "Meja",
    guest: "Tetamu",
    pts: "mata",
    pt: "mata",
    loadingMenu: "Memuatkan menu…",
    shop: "Menu",
    rewards: "Ganjaran",
    cart: "Troli",
    profile: "Profil",
    addToOrder: "Tambah pesanan",
    chooseOptions: "Pilih pilihan",
    addAnother: "Tambah lagi",
    inCart: "dalam troli",
    language: "Bahasa",
    ingredients: "Bahan",
    allergens: "Alergen & diet",
    notes: "Nota",
    energy: "Tenaga",
    sugar: "Gula",
    tapAddHint: "Tekan tambah di bawah untuk masukkan pesanan.",
    productDetails: "Butiran Produk",
    dineIn: "Makan di sini",
    takeaway: "Bungkus",
    nettPrice: "Harga bersih · Termasuk cukai",
    required: "Wajib",
    optional: "Pilihan",
    standard: "Standard",
    included: "Termasuk",
    upTo: "Sehingga",
    pickExactly: "Pilih",
    frequentlyPairedWith: "Selalu dipadankan dengan",
    add: "Tambah",
    added: "Ditambah",
    kitchenNotes: "Nota dapur & barista",
    kitchenNotesPlaceholder: "Permintaan khas (cth. kurang ais, sos diasingkan, alahan)…",
    kitchenNotesHint: "Kami akan cuba memenuhi keperluan diet atau hidangan anda.",
    earnsPoints: "Kumpul mata iRewards",
    joinToEarn: "Sertai untuk kumpul mata",
    earnOnThisOrder: "Anda akan dapat",
    joinToClaimPoints: "Sertai di WhatsApp selepas bayar untuk tuntut",
    onThisOrder: "untuk pesanan ini.",
    pointsAfterPayment: "Dikreditkan setelah pembayaran disahkan.",
    backToMenu: "Kembali ke menu",
    productUnavailable: "Produk ini tidak tersedia buat masa ini.",
    viewCart: "Lihat troli",
  },
};

export function storefrontCopy(lang: ProgramLanguage): StorefrontCopy {
  return COPY[lang];
}

/** "1 pt" / "8 pts" — zh and ms use one form for both. */
export function pointsUnit(count: number, copy: StorefrontCopy): string {
  return count === 1 ? copy.pt : copy.pts;
}

export function storageKeyForStorefrontLang(merchantSlug: string) {
  return `irewards-storefront-lang-${merchantSlug}`;
}
