/** marzban-sentinel  **/
import { Bot, InlineKeyboard } from "grammy";

import { env } from "../config/env.js";
import { MarzbanClient } from "../marzban/client.js";
import { isAuthorized } from "../security/auth.js";

import { languageMenu, mainMenu } from "./menu.js";
import { Language, t } from "./i18n.js";

const userLanguages = new Map<number, Language>();

const marzban = new MarzbanClient();

export const bot = new Bot(env.telegram.botToken);

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) {
    return "—";
  }

  const date = new Date(timestamp * 1000);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("fa-IR");
}

function formatSubscriptionUrl(
  subscriptionUrl: string | null,
): string | null {
  if (!subscriptionUrl) {
    return null;
  }

  if (
    subscriptionUrl.startsWith("http://") ||
    subscriptionUrl.startsWith("https://")
  ) {
    return subscriptionUrl;
  }

  const baseUrl = env.marzban.subscriptionUrl;

  if (subscriptionUrl.startsWith("/")) {
    return `${baseUrl}${subscriptionUrl}`;
  }

  return `${baseUrl}/${subscriptionUrl}`;
}

/**
 * Authorization middleware.
 *
 * Only authorized Telegram users are allowed
 * to continue to the bot handlers.
 */
bot.use(async (ctx, next) => {
  if (!ctx.from) {
    return;
  }

  if (!isAuthorized(ctx.from.id)) {
    await ctx.reply(
      "⛔ شما اجازه استفاده از این ربات را ندارید.",
    );

    return;
  }

  await next();
});

/**
 * /start
 */
bot.command("start", async (ctx) => {
  await ctx.reply(
    t("fa", "welcome"),
    {
      reply_markup: languageMenu(),
    },
  );
});

/**
 * Persian language
 */
bot.callbackQuery("lang_fa", async (ctx) => {
  const telegramId = ctx.from.id;

  userLanguages.set(telegramId, "fa");

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    t("fa", "mainMenu"),
    {
      reply_markup: mainMenu("fa"),
    },
  );
});

/**
 * English language
 */
bot.callbackQuery("lang_en", async (ctx) => {
  const telegramId = ctx.from.id;

  userLanguages.set(telegramId, "en");

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    t("en", "mainMenu"),
    {
      reply_markup: mainMenu("en"),
    },
  );
});

/**
 * Users list
 */
bot.callbackQuery("users", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  await ctx.answerCallbackQuery();

  try {
    const result = await marzban.getUsers();

    if (result.users.length === 0) {
      await ctx.editMessageText(
        lang === "fa"
          ? "👥 هیچ کاربری پیدا نشد."
          : "👥 No users found.",
        {
          reply_markup: new InlineKeyboard()
            .text(
              lang === "fa"
                ? "🔙 بازگشت"
                : "🔙 Back",
              "back_to_menu",
            ),
        },
      );

      return;
    }

    const keyboard = new InlineKeyboard();

    for (const user of result.users.slice(0, 30)) {
      keyboard
        .text(
          `👤 ${user.username}`,
          `user:${user.username}`,
        )
        .row();
    }

    keyboard.text(
      lang === "fa"
        ? "🔙 بازگشت"
        : "🔙 Back",
      "back_to_menu",
    );

    await ctx.editMessageText(
      lang === "fa"
        ? `👥 کاربران\n\nتعداد کل: ${result.total}`
        : `👥 Users\n\nTotal: ${result.total}`,
      {
        reply_markup: keyboard,
      },
    );
  } catch (error) {
    console.error("Failed to fetch users:", error);

    await ctx.editMessageText(
      lang === "fa"
        ? "❌ دریافت لیست کاربران با خطا مواجه شد."
        : "❌ Failed to fetch users.",
      {
        reply_markup: new InlineKeyboard()
          .text(
            lang === "fa"
              ? "🔙 بازگشت"
              : "🔙 Back",
            "back_to_menu",
          ),
      },
    );
  }
});

/**
 * User details
 */
bot.callbackQuery(/^user:(.+)$/, async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  const username = ctx.match[1];

  if (!username) {
    await ctx.answerCallbackQuery({
      text:
        lang === "fa"
          ? "❌ نام کاربر نامعتبر است."
          : "❌ Invalid username.",
    });

    return;
  }

  await ctx.answerCallbackQuery();

  try {
    const user = await marzban.getUser(username);

    const subscriptionUrl = formatSubscriptionUrl(
      user.subscription_url,
    );

    const status = user.status ?? "—";

    const usedTraffic = formatBytes(
      user.used_traffic,
    );

    const dataLimit =
      user.data_limit === null
        ? lang === "fa"
          ? "نامحدود"
          : "Unlimited"
        : formatBytes(user.data_limit);

    const expire = formatDate(user.expire);

    const text =
      lang === "fa"
        ? [
            `👤 کاربر: ${user.username}`,
            "",
            `📌 وضعیت: ${status}`,
            `📊 مصرف: ${usedTraffic}`,
            `💾 محدودیت حجم: ${dataLimit}`,
            `📅 انقضا: ${expire}`,
            "",
            subscriptionUrl
              ? `🔗 لینک اشتراک:\n${subscriptionUrl}`
              : "🔗 لینک اشتراک: —",
          ].join("\n")
        : [
            `👤 User: ${user.username}`,
            "",
            `📌 Status: ${status}`,
            `📊 Used traffic: ${usedTraffic}`,
            `💾 Data limit: ${dataLimit}`,
            `📅 Expiration: ${expire}`,
            "",
            subscriptionUrl
              ? `🔗 Subscription URL:\n${subscriptionUrl}`
              : "🔗 Subscription URL: —",
          ].join("\n");

    const keyboard = new InlineKeyboard()
      .text(
        lang === "fa"
          ? "🔙 بازگشت به کاربران"
          : "🔙 Back to users",
        "users",
      )
      .row()
      .text(
        lang === "fa"
          ? "🏠 منوی اصلی"
          : "🏠 Main Menu",
        "back_to_menu",
      );

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error(
      `Failed to fetch user ${username}:`,
      error,
    );

    await ctx.editMessageText(
      lang === "fa"
        ? "❌ دریافت اطلاعات کاربر با خطا مواجه شد."
        : "❌ Failed to fetch user information.",
      {
        reply_markup: new InlineKeyboard()
          .text(
            lang === "fa"
              ? "🔙 بازگشت"
              : "🔙 Back",
            "users",
          ),
      },
    );
  }
});

/**
 * Back to main menu
 */
bot.callbackQuery("back_to_menu", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    t(lang, "mainMenu"),
    {
      reply_markup: mainMenu(lang),
    },
  );
});

/**
 * Statistics
 */
bot.callbackQuery("stats", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  await ctx.answerCallbackQuery();

  try {
    const result = await marzban.getUsers();

    const totalUsers = result.total;

    const activeUsers = result.users.filter(
      (user) => user.status === "active",
    ).length;

    const disabledUsers = result.users.filter(
      (user) => user.status === "disabled",
    ).length;

    const totalTraffic = result.users.reduce(
      (total, user) =>
        total + user.used_traffic,
      0,
    );

    const text =
      lang === "fa"
        ? [
            "📊 آمار",
            "",
            `👥 تعداد کاربران: ${totalUsers}`,
            `🟢 فعال: ${activeUsers}`,
            `🔴 غیرفعال: ${disabledUsers}`,
            `📡 مصرف ترافیک: ${formatBytes(totalTraffic)}`,
          ].join("\n")
        : [
            "📊 Statistics",
            "",
            `👥 Total users: ${totalUsers}`,
            `🟢 Active: ${activeUsers}`,
            `🔴 Disabled: ${disabledUsers}`,
            `📡 Used traffic: ${formatBytes(totalTraffic)}`,
          ].join("\n");

    await ctx.editMessageText(text, {
      reply_markup: new InlineKeyboard()
        .text(
          lang === "fa"
            ? "🔙 بازگشت"
            : "🔙 Back",
          "back_to_menu",
        ),
    });
  } catch (error) {
    console.error(
      "Failed to fetch statistics:",
      error,
    );

    await ctx.editMessageText(
      lang === "fa"
        ? "❌ دریافت آمار با خطا مواجه شد."
        : "❌ Failed to fetch statistics.",
      {
        reply_markup: new InlineKeyboard()
          .text(
            lang === "fa"
              ? "🔙 بازگشت"
              : "🔙 Back",
            "back_to_menu",
          ),
      },
    );
  }
});

/**
 * Backup
 *
 * Backup functionality will be implemented
 * in a later stage.
 */
bot.callbackQuery("backup", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    lang === "fa"
      ? "💾 بخش بکاپ هنوز پیاده‌سازی نشده است."
      : "💾 Backup functionality is not implemented yet.",
    {
      reply_markup: new InlineKeyboard()
        .text(
          lang === "fa"
            ? "🔙 بازگشت"
            : "🔙 Back",
          "back_to_menu",
        ),
    },
  );
});


/**
 * Settings
 */
bot.callbackQuery("settings", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  await ctx.answerCallbackQuery();

  const settingsKeyboard = new InlineKeyboard()
    .text(
      lang === "fa"
        ? "🌐 زبان"
        : "🌐 Language",
      "settings_language",
    )
    .row()
    .text(
      lang === "fa"
        ? "👤 نقش کاربر"
        : "👤 User Role",
      "settings_role",
    )
    .row()
    .text(
      lang === "fa"
        ? "🔐 امنیت"
        : "🔐 Security",
      "settings_security",
    )
    .row()
    .text(
      lang === "fa"
        ? "ℹ️ درباره Sentinel"
        : "ℹ️ About Sentinel",
      "settings_about",
    )
    .row()
    .text(
      lang === "fa"
        ? "🔙 بازگشت"
        : "🔙 Back",
      "back_to_menu",
    );

  await ctx.editMessageText(
    lang === "fa"
      ? "⚙️ تنظیمات"
      : "⚙️ Settings",
    {
      reply_markup: settingsKeyboard,
    },
  );
});


/**
 * Language settings
 */
bot.callbackQuery("settings_language", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  await ctx.answerCallbackQuery();

  const languageKeyboard = new InlineKeyboard()
    .text(
      lang === "fa"
        ? "🇮🇷 فارسی"
        : "🇮🇷 Persian",
      "settings_set_lang_fa",
    )
    .row()
    .text(
      lang === "fa"
        ? "🇬🇧 English"
        : "🇬🇧 انگلیسی",
      "settings_set_lang_en",
    )
    .row()
    .text(
      lang === "fa"
        ? "🔙 بازگشت"
        : "🔙 Back",
      "settings",
    );

  await ctx.editMessageText(
    lang === "fa"
      ? "🌐 زبان\n\nزبان فعلی: 🇮🇷 فارسی"
      : "🌐 Language\n\nCurrent language: 🇬🇧 English",
    {
      reply_markup: languageKeyboard,
    },
  );
});

/**
 * Set Persian language from Settings
 */
bot.callbackQuery("settings_set_lang_fa", async (ctx) => {
  const telegramId = ctx.from.id;

  userLanguages.set(telegramId, "fa");

  await ctx.answerCallbackQuery();

  const languageKeyboard = new InlineKeyboard()
    .text("🇮🇷 فارسی", "settings_set_lang_fa")
    .row()
    .text("🇬🇧 English", "settings_set_lang_en")
    .row()
    .text("🔙 بازگشت", "settings");

  await ctx.editMessageText(
    "🌐 زبان\n\nزبان فعلی: 🇮🇷 فارسی",
    {
      reply_markup: languageKeyboard,
    },
  );
});

/**
 * Set English language from Settings
 */
bot.callbackQuery("settings_set_lang_en", async (ctx) => {
  const telegramId = ctx.from.id;

  userLanguages.set(telegramId, "en");

  await ctx.answerCallbackQuery();

  const languageKeyboard = new InlineKeyboard()
    .text("🇮🇷 Persian", "settings_set_lang_fa")
    .row()
    .text("🇬🇧 English", "settings_set_lang_en")
    .row()
    .text("🔙 Back", "settings");

  await ctx.editMessageText(
    "🌐 Language\n\nCurrent language: 🇬🇧 English",
    {
      reply_markup: languageKeyboard,
    },
  );
});

/**
 * Error handler
 */
bot.catch((error) => {
  console.error(
    "Telegram bot error:",
    error,
  );
});