const messages = {
  fa: {
    welcome: "🤖 به Marzban Sentinel خوش آمدید",
    chooseLanguage: "زبان خود را انتخاب کنید:",
    mainMenu: "منوی اصلی",
    users: "👥 کاربران",
    statistics: "📊 آمار",
    backup: "💾 بکاپ",
    settings: "⚙️ تنظیمات",
  },

  en: {
    welcome: "🤖 Welcome to Marzban Sentinel",
    chooseLanguage: "Choose your language:",
    mainMenu: "Main Menu",
    users: "👥 Users",
    statistics: "📊 Statistics",
    backup: "💾 Backup",
    settings: "⚙️ Settings",
  },
};

export type Language = "fa" | "en";

export function t(lang: Language, key: keyof typeof messages.fa) {
  return messages[lang][key];
}