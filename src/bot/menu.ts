import { InlineKeyboard } from "grammy";
import { Language, t } from "./i18n.js";

export function languageMenu() {
  return new InlineKeyboard()
    .text("🇮🇷 فارسی", "lang_fa")
    .row()
    .text("🇬🇧 English", "lang_en");
}


export function mainMenu(lang: Language) {
  return new InlineKeyboard()
    .text(t(lang, "users"), "users")
    .row()
    .text(t(lang, "statistics"), "stats")
    .row()
    .text(t(lang, "backup"), "backup")
    .row()
    .text(t(lang, "settings"), "settings");
}