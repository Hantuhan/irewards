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
  orderType: string;
  packToGo: string;
  subtotal: string;
  total: string;
  discounts: string;
  promoAndPoints: string;
  promoCode: string;
  paymentMethod: string;
  redeemPoints: string;
  max: string;
  browseMenu: string;
  cartEmpty: string;
  continueLabel: string;
  continueHint: string;
  backToSuggestions: string;
  inclTakeaway: string;
  each: string;
  itemOne: string;
  itemMany: string;
  loadingCart: string;
  youHave: string;
  available: string;
  reservedOnUnpaid: string;
  notMemberYet: string;
  verifyToSpend: string;
  sendWhatsAppCode: string;
  sending: string;
  fourDigitCode: string;
  verify: string;
  verifiedCanSpend: string;
  payWithDuitnow: string;
  payWithCard: string;
  payWithWallet: string;
  starting: string;
  duitnowLabel: string;
  duitnowHint: string;
  cardLabel: string;
  cardHint: string;
  walletLabel: string;
  walletHint: string;
  popular: string;
  duitnowNote: string;
  cardNote: string;
  walletNote: string;
  serviceCharge: string;
  tax: string;
  checkoutFailed: string;
  couldNotSendCode: string;
  verificationFailed: string;
  enterFourDigit: string;
  returningMember: string;
  yourUsual: string;
  yourUsualOrder: string;
  dismissSuggestion: string;
  member: string;
  addForStamp: string;
  lookupFailed: string;
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
    orderType: "Order type",
    packToGo: "Pack this item to go",
    subtotal: "Subtotal",
    total: "Total",
    discounts: "Discounts",
    promoAndPoints: "Promo & points",
    promoCode: "Promo code",
    paymentMethod: "Payment method",
    redeemPoints: "Redeem points",
    max: "max",
    browseMenu: "Browse menu",
    cartEmpty: "Your cart is empty.",
    continueLabel: "Continue",
    continueHint: "Tap continue to review add-ons before payment.",
    backToSuggestions: "Back to suggestions",
    inclTakeaway: "incl. takeaway",
    each: "each",
    itemOne: "item",
    itemMany: "items",
    loadingCart: "Loading cart…",
    youHave: "You have",
    available: "available",
    reservedOnUnpaid: "reserved on an unpaid order",
    notMemberYet: "Not a member yet? Order & pay, then join on WhatsApp. Redeem next visit.",
    verifyToSpend: "Verify on WhatsApp to spend them.",
    sendWhatsAppCode: "Send WhatsApp code",
    sending: "Sending…",
    fourDigitCode: "4-digit code",
    verify: "Verify",
    verifiedCanSpend: "Verified — you can spend points on this order.",
    payWithDuitnow: "Pay with DuitNow",
    payWithCard: "Pay with card",
    payWithWallet: "Pay with e-wallet",
    starting: "Starting…",
    duitnowLabel: "DuitNow QR",
    duitnowHint: "Scan with any banking app",
    cardLabel: "Card",
    cardHint: "Visa, Mastercard, Amex",
    walletLabel: "E-wallet",
    walletHint: "Touch ’n Go, GrabPay, ShopeePay",
    popular: "Popular",
    duitnowNote: "You’ll see a QR after confirming — pay in your bank app.",
    cardNote: "Card details are entered on a secure payment page.",
    walletNote: "Choose your wallet on the next screen.",
    serviceCharge: "Service charge",
    tax: "Tax",
    checkoutFailed: "Checkout failed",
    couldNotSendCode: "Could not send code",
    verificationFailed: "Verification failed",
    enterFourDigit: "Enter the 4-digit code from WhatsApp.",
    returningMember: "Returning member? Load your points",
    yourUsual: "Your usual",
    yourUsualOrder: "Your usual order",
    dismissSuggestion: "Dismiss suggestion",
    member: "Member",
    addForStamp: "Add {item} for +1 stamp?",
    lookupFailed: "Lookup failed",
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
    orderType: "用餐方式",
    packToGo: "此项打包",
    subtotal: "小计",
    total: "总计",
    discounts: "优惠",
    promoAndPoints: "优惠码与积分",
    promoCode: "优惠码",
    paymentMethod: "付款方式",
    redeemPoints: "使用积分",
    max: "最多",
    browseMenu: "浏览菜单",
    cartEmpty: "购物车是空的。",
    continueLabel: "继续",
    continueHint: "点击继续，付款前查看加购建议。",
    backToSuggestions: "返回加购建议",
    inclTakeaway: "含打包费",
    each: "每份",
    itemOne: "件",
    itemMany: "件",
    loadingCart: "加载购物车中…",
    youHave: "您有",
    available: "可用",
    reservedOnUnpaid: "已保留于未付款的订单",
    notMemberYet: "还不是会员？先下单付款，然后在 WhatsApp 加入，下次消费即可使用。",
    verifyToSpend: "通过 WhatsApp 验证后即可使用。",
    sendWhatsAppCode: "发送 WhatsApp 验证码",
    sending: "发送中…",
    fourDigitCode: "4 位验证码",
    verify: "验证",
    verifiedCanSpend: "已验证 — 本次订单可使用积分。",
    payWithDuitnow: "使用 DuitNow 付款",
    payWithCard: "使用银行卡付款",
    payWithWallet: "使用电子钱包付款",
    starting: "处理中…",
    duitnowLabel: "DuitNow 二维码",
    duitnowHint: "使用任何银行 App 扫码",
    cardLabel: "银行卡",
    cardHint: "Visa、Mastercard、Amex",
    walletLabel: "电子钱包",
    walletHint: "Touch ’n Go、GrabPay、ShopeePay",
    popular: "热门",
    duitnowNote: "确认后会显示二维码，请在银行 App 中付款。",
    cardNote: "银行卡信息将在安全付款页面输入。",
    walletNote: "在下一个页面选择您的电子钱包。",
    serviceCharge: "服务费",
    tax: "税",
    checkoutFailed: "结账失败",
    couldNotSendCode: "无法发送验证码",
    verificationFailed: "验证失败",
    enterFourDigit: "请输入 WhatsApp 收到的 4 位验证码。",
    returningMember: "老会员？载入您的积分",
    yourUsual: "您的常点",
    yourUsualOrder: "您的常点订单",
    dismissSuggestion: "忽略建议",
    member: "会员",
    addForStamp: "加点 {item}，多得 1 个印章？",
    lookupFailed: "查询失败",
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
    orderType: "Jenis pesanan",
    packToGo: "Bungkus item ini",
    subtotal: "Jumlah kecil",
    total: "Jumlah",
    discounts: "Diskaun",
    promoAndPoints: "Kod promosi & mata",
    promoCode: "Kod promosi",
    paymentMethod: "Cara pembayaran",
    redeemPoints: "Tebus mata",
    max: "maks",
    browseMenu: "Lihat menu",
    cartEmpty: "Troli anda kosong.",
    continueLabel: "Teruskan",
    continueHint: "Tekan teruskan untuk lihat tambahan sebelum bayar.",
    backToSuggestions: "Kembali ke cadangan",
    inclTakeaway: "termasuk bungkus",
    each: "setiap satu",
    itemOne: "item",
    itemMany: "item",
    loadingCart: "Memuatkan troli…",
    youHave: "Anda ada",
    available: "tersedia",
    reservedOnUnpaid: "ditempah pada pesanan belum dibayar",
    notMemberYet: "Belum jadi ahli? Pesan & bayar dahulu, kemudian sertai di WhatsApp. Tebus pada lawatan akan datang.",
    verifyToSpend: "Sahkan melalui WhatsApp untuk menggunakannya.",
    sendWhatsAppCode: "Hantar kod WhatsApp",
    sending: "Menghantar…",
    fourDigitCode: "Kod 4 digit",
    verify: "Sahkan",
    verifiedCanSpend: "Disahkan — anda boleh guna mata untuk pesanan ini.",
    payWithDuitnow: "Bayar dengan DuitNow",
    payWithCard: "Bayar dengan kad",
    payWithWallet: "Bayar dengan e-dompet",
    starting: "Memulakan…",
    duitnowLabel: "DuitNow QR",
    duitnowHint: "Imbas dengan mana-mana app bank",
    cardLabel: "Kad",
    cardHint: "Visa, Mastercard, Amex",
    walletLabel: "E-dompet",
    walletHint: "Touch ’n Go, GrabPay, ShopeePay",
    popular: "Popular",
    duitnowNote: "Anda akan lihat QR selepas sah — bayar dalam app bank anda.",
    cardNote: "Butiran kad dimasukkan di halaman pembayaran selamat.",
    walletNote: "Pilih e-dompet anda di skrin seterusnya.",
    serviceCharge: "Caj perkhidmatan",
    tax: "Cukai",
    checkoutFailed: "Pembayaran gagal",
    couldNotSendCode: "Tidak dapat hantar kod",
    verificationFailed: "Pengesahan gagal",
    enterFourDigit: "Masukkan kod 4 digit dari WhatsApp.",
    returningMember: "Ahli lama? Muatkan mata anda",
    yourUsual: "Pesanan biasa anda",
    yourUsualOrder: "Pesanan biasa anda",
    dismissSuggestion: "Tolak cadangan",
    member: "Ahli",
    addForStamp: "Tambah {item} untuk +1 cop?",
    lookupFailed: "Carian gagal",
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
