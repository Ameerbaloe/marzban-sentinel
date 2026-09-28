/** marzban-sentinel */

import { Bot, InlineKeyboard } from "grammy";
import { env } from "../config/env.js";
import { MarzbanClient } from "../marzban/client.js";
import {
  getManagedUsers,
  removeUser,
} from "../database/db.js";

import {
  getUserRole,
  hasPermission,
  isAuthorized,
  setUserRole,
} from "../security/auth.js";

import { can } from "../security/permissions.js";

import {
  languageMenu,
  mainMenu,
} from "./menu.js";

import {
  Language,
  t,
} from "./i18n.js";

const userLanguages =
  new Map<number, Language>();

const pendingAdminAdd =
  new Set<number>();

const marzban =
  new MarzbanClient();

export const bot =
  new Bot(env.telegram.botToken);

function formatBytes(
  bytes: number,
): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const unitIndex = Math.min(
    Math.floor(
      Math.log(bytes) /
        Math.log(1024),
    ),
    units.length - 1,
  );

  const value =
    bytes /
    1024 ** unitIndex;

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function formatDate(
  timestamp: number | null,
): string {
  if (!timestamp) {
    return "—";
  }

  const date =
    new Date(timestamp * 1000);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "fa-IR",
  );
}

function formatSubscriptionUrl(
  subscriptionUrl: string | null,
): string | null {
  if (!subscriptionUrl) {
    return null;
  }

  if (
    subscriptionUrl.startsWith(
      "http://",
    ) ||
    subscriptionUrl.startsWith(
      "https://",
    )
  ) {
    return subscriptionUrl;
  }

  const baseUrl =
    env.marzban.subscriptionUrl;

  if (
    subscriptionUrl.startsWith("/")
  ) {
    return `${baseUrl}${subscriptionUrl}`;
  }

  return `${baseUrl}/${subscriptionUrl}`;
}

/**
 * Validate and normalize a user-provided
 * Marzban Subscription URL.
 *
 * Only the configured Marzban
 * subscription host is accepted.
 */
function normalizeSubscriptionUrl(
  input: string,
): string | null {
  const value =
    input.trim();

  if (!value) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  let configuredUrl: URL;

  try {
    configuredUrl =
      new URL(
        env.marzban.subscriptionUrl,
      );
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" &&
    url.protocol !== "http:"
  ) {
    return null;
  }

  if (
    url.hostname !==
    configuredUrl.hostname
  ) {
    return null;
  }

  if (
    !url.pathname
      .split("/")
      .filter(Boolean)
      .includes("sub")
  ) {
    return null;
  }

  return url.toString();
}

/**
 * Read subscription information
 * from Marzban subscription headers.
 */
async function getSubscriptionInfo(
  subscriptionUrl: string,
): Promise<{
  upload: number;
  download: number;
  total: number;
  expire: number | null;
  profileTitle: string | null;
}> {
  const response =
    await fetch(
      subscriptionUrl,
      {
        method: "GET",
        headers: {
          Accept:
            "text/plain, */*",
          "User-Agent":
            "marzban-sentinel",
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `Subscription request failed: ${response.status}`,
    );
  }

  const userInfo =
    response.headers.get(
      "subscription-userinfo",
    );

  const profileTitle =
    response.headers.get(
      "profile-title",
    );

  if (!userInfo) {
    throw new Error(
      "Subscription information header was not returned.",
    );
  }

  const values: Record<
    string,
    number
  > = {};

  for (
    const part of userInfo.split(";")
  ) {
    const [rawKey, rawValue] =
      part.trim().split("=");

    if (
      !rawKey ||
      !rawValue
    ) {
      continue;
    }

    const numberValue =
      Number(rawValue);

    if (
      Number.isFinite(
        numberValue,
      )
    ) {
      values[rawKey] =
        numberValue;
    }
  }

  return {
    upload:
      values.upload ?? 0,

    download:
      values.download ?? 0,

    total:
      values.total ?? 0,

    expire:
  typeof values.expire ===
    "number" &&
  Number.isFinite(
    values.expire,
    )
    ? values.expire
    : null,

    profileTitle:
      profileTitle
        ? profileTitle
        : null,
  };
}

/**
 * Authorization middleware.
 *
 * Owner/Admin can continue normally.
 *
 * Normal users are allowed to continue
 * only for text messages so they can
 * submit their Subscription URL.
 *
 * Management callbacks are blocked.
 */
bot.use(
  async (ctx, next) => {
    if (!ctx.from) {
      return;
    }

    if (
      isAuthorized(
        ctx.from.id,
      )
    ) {
      await next();
      return;
    }

    if (
      ctx.message?.text
    ) {
      await next();
      return;
    }

    await ctx.reply(
      "🤖 سلام\n\n" +
        "برای مشاهده مشخصات اشتراک خود، " +
        "لطفاً لینک Subscription خود را ارسال کنید.",
    );
  },
);

/**
 * /start
 */
bot.command(
  "start",
  async (ctx) => {
    if (!ctx.from) {
      return;
    }

    if (
      !isAuthorized(
        ctx.from.id,
      )
    ) {
      await ctx.reply(
        "🤖 سلام\n\n" +
          "برای مشاهده مشخصات اشتراک خود، " +
          "لطفاً لینک Subscription خود را ارسال کنید.",
      );

      return;
    }

    await ctx.reply(
      t("fa", "welcome"),
      {
        reply_markup:
          languageMenu(),
      },
    );
  },
);

/**
 * Persian language
 */
bot.callbackQuery(
  "lang_fa",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    if (
      !isAuthorized(
        telegramId,
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            "⛔ شما دسترسی مدیریتی ندارید.",
          show_alert: true,
        },
      );

      return;
    }

    userLanguages.set(
      telegramId,
      "fa",
    );

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      t("fa", "mainMenu"),
      {
        reply_markup:
          mainMenu("fa"),
      },
    );
  },
);

/**
 * English language
 */
bot.callbackQuery(
  "lang_en",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    if (
      !isAuthorized(
        telegramId,
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            "⛔ You do not have management access.",
          show_alert: true,
        },
      );

      return;
    }

    userLanguages.set(
      telegramId,
      "en",
    );

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      t("en", "mainMenu"),
      {
        reply_markup:
          mainMenu("en"),
      },
    );
  },
);

/**
 * Users list
 */
bot.callbackQuery(
  "users",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !can(
        role,
        "users.view",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ شما اجازه مشاهده کاربران را ندارید."
              : "⛔ You do not have permission to view users.",
          show_alert: true,
        },
      );

      return;
    }

    await ctx.answerCallbackQuery();

    try {
      const result =
        await marzban.getUsers();

      if (
        result.users.length ===
        0
      ) {
        await ctx.editMessageText(
          lang === "fa"
            ? "👥 هیچ کاربری پیدا نشد."
            : "👥 No users found.",
          {
            reply_markup:
              new InlineKeyboard()
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

      const keyboard =
        new InlineKeyboard();

      for (
        const user of
        result.users.slice(
          0,
          30,
        )
      ) {
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
          reply_markup:
            keyboard,
        },
      );
    } catch (error) {
      console.error(
        "Failed to fetch users:",
        error,
      );

      await ctx.editMessageText(
        lang === "fa"
          ? "❌ دریافت لیست کاربران با خطا مواجه شد."
          : "❌ Failed to fetch users.",
        {
          reply_markup:
            new InlineKeyboard()
              .text(
                lang === "fa"
                  ? "🔙 بازگشت"
                  : "🔙 Back",
                "back_to_menu",
              ),
        },
      );
    }
  },
);

/**
 * User details
 */
bot.callbackQuery(
  /^user:(.+)$/,
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const username =
      ctx.match[1];

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !can(
        role,
        "users.details",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ شما اجازه مشاهده جزئیات کاربران را ندارید."
              : "⛔ You do not have permission to view user details.",
          show_alert: true,
        },
      );

      return;
    }

    if (!username) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ نام کاربر نامعتبر است."
              : "❌ Invalid username.",
        },
      );

      return;
    }

    await ctx.answerCallbackQuery();

    try {
      const user =
        await marzban.getUser(
          username,
        );

      const subscriptionUrl =
        formatSubscriptionUrl(
          user.subscription_url,
        );

      const status =
        user.status ?? "—";

      const usedTraffic =
        formatBytes(
          user.used_traffic,
        );

      const dataLimit =
        user.data_limit ===
        null
          ? lang === "fa"
            ? "نامحدود"
            : "Unlimited"
          : formatBytes(
              user.data_limit,
            );

      const expire =
        formatDate(
          user.expire,
        );

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

      const keyboard =
        new InlineKeyboard()
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

      await ctx.editMessageText(
        text,
        {
          reply_markup:
            keyboard,
        },
      );
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
          reply_markup:
            new InlineKeyboard()
              .text(
                lang === "fa"
                  ? "🔙 بازگشت"
                  : "🔙 Back",
                "users",
              ),
        },
      );
    }
  },
);

/**
 * Back to main menu
 */
bot.callbackQuery(
  "back_to_menu",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    if (
      !isAuthorized(
        telegramId,
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ شما دسترسی مدیریتی ندارید."
              : "⛔ You do not have management access.",
          show_alert: true,
        },
      );

      return;
    }

    pendingAdminAdd.delete(
      telegramId,
    );

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      t(lang, "mainMenu"),
      {
        reply_markup:
          mainMenu(lang),
      },
    );
  },
);

/**
 * Statistics
 */
bot.callbackQuery(
  "stats",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !can(
        role,
        "stats.view",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ شما اجازه مشاهده آمار را ندارید."
              : "⛔ You do not have permission to view statistics.",
          show_alert: true,
        },
      );

      return;
    }

    await ctx.answerCallbackQuery();

    try {
      const result =
        await marzban.getUsers();

      const totalUsers =
        result.total;

      const activeUsers =
        result.users.filter(
          (user) =>
            user.status ===
            "active",
        ).length;

      const disabledUsers =
        result.users.filter(
          (user) =>
            user.status ===
            "disabled",
        ).length;

      const totalTraffic =
        result.users.reduce(
          (
            total,
            user,
          ) =>
            total +
            user.used_traffic,
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

      await ctx.editMessageText(
        text,
        {
          reply_markup:
            new InlineKeyboard()
              .text(
                lang === "fa"
                  ? "🔙 بازگشت"
                  : "🔙 Back",
                "back_to_menu",
              ),
        },
      );
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
          reply_markup:
            new InlineKeyboard()
              .text(
                lang === "fa"
                  ? "🔙 بازگشت"
                  : "🔙 Back",
                "back_to_menu",
              ),
        },
      );
    }
  },
);

/**
 * Backup
 *
 * Backup functionality will be
 * implemented in a later stage.
 */
bot.callbackQuery(
  "backup",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !can(
        role,
        "backup.use",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ شما اجازه استفاده از بکاپ را ندارید."
              : "⛔ You do not have permission to use backup.",
          show_alert: true,
        },
      );

      return;
    }

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      lang === "fa"
        ? "💾 بخش بکاپ هنوز پیاده‌سازی نشده است."
        : "💾 Backup functionality is not implemented yet.",
      {
        reply_markup:
          new InlineKeyboard()
            .text(
              lang === "fa"
                ? "🔙 بازگشت"
                : "🔙 Back",
              "back_to_menu",
            ),
      },
    );
  },
);

/**
 * Settings
 */
bot.callbackQuery(
  "settings",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !can(
        role,
        "settings.view",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ شما اجازه ورود به تنظیمات را ندارید."
              : "⛔ You do not have permission to access settings.",
          show_alert: true,
        },
      );

      return;
    }

    pendingAdminAdd.delete(
      telegramId,
    );

    await ctx.answerCallbackQuery();

    const settingsKeyboard =
      new InlineKeyboard()
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
            ? "🔐 مدیریت دسترسی‌ها"
            : "🔐 Access Management",
          "settings_access",
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
        reply_markup:
          settingsKeyboard,
      },
    );
  },
);

/**
 * Access management
 *
 * Owner only.
 */
bot.callbackQuery(
  "settings_access",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !can(
        role,
        "access.manage",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ فقط Owner به این بخش دسترسی دارد."
              : "⛔ Only the Owner can access this section.",
          show_alert: true,
        },
      );

      return;
    }

    pendingAdminAdd.delete(
      telegramId,
    );

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      lang === "fa"
        ? "🔐 مدیریت دسترسی‌ها"
        : "🔐 Access Management",
      {
        reply_markup:
          new InlineKeyboard()
            .text(
              lang === "fa"
                ? "➕ افزودن Admin"
                : "➕ Add Admin",
              "admin_add",
            )
            .row()
            .text(
              lang === "fa"
                ? "👥 لیست Adminها"
                : "👥 Admin List",
              "admin_list",
            )
            .row()
            .text(
              lang === "fa"
                ? "🔙 بازگشت"
                : "🔙 Back",
              "settings",
            ),
      },
    );
  },
);

/**
 * Start adding an Admin
 */
bot.callbackQuery(
  "admin_add",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !hasPermission(
        role,
        "owner",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ فقط Owner می‌تواند Admin اضافه کند."
              : "⛔ Only the Owner can add Admins.",
          show_alert: true,
        },
      );

      return;
    }

    pendingAdminAdd.add(
      telegramId,
    );

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      lang === "fa"
        ? "➕ افزودن Admin\n\nلطفاً Telegram ID کاربر را ارسال کنید.\n\nمثال:\n123456789"
        : "➕ Add Admin\n\nPlease send the user's Telegram ID.\n\nExample:\n123456789",
      {
        reply_markup:
          new InlineKeyboard().text(
            lang === "fa"
              ? "❌ لغو"
              : "❌ Cancel",
            "settings_access",
          ),
      },
    );
  },
);

/**
 * Show Admin list
 */
bot.callbackQuery(
  "admin_list",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !hasPermission(
        role,
        "owner",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ فقط Owner می‌تواند لیست Adminها را ببیند."
              : "⛔ Only the Owner can view the Admin list.",
          show_alert: true,
        },
      );

      return;
    }

    await ctx.answerCallbackQuery();

    const users =
      getManagedUsers().filter(
        (user) =>
          user.role ===
          "admin",
      );

    if (users.length === 0) {
      await ctx.editMessageText(
        lang === "fa"
          ? "👥 Adminها\n\nهیچ Adminی ثبت نشده است."
          : "👥 Admins\n\nNo Admins have been registered.",
        {
          reply_markup:
            new InlineKeyboard()
              .text(
                lang === "fa"
                  ? "🔙 بازگشت"
                  : "🔙 Back",
                "settings_access",
              ),
        },
      );

      return;
    }

    const keyboard =
      new InlineKeyboard();

    for (
      const user of users
    ) {
      keyboard
        .text(
          `🛠️ Admin | ${user.telegramId}`,
          `managed_info_${user.telegramId}`,
        )
        .text(
          "❌",
          `managed_remove_${user.telegramId}`,
        )
        .row();
    }

    keyboard.text(
      lang === "fa"
        ? "🔙 بازگشت"
        : "🔙 Back",
      "settings_access",
    );

    const userList =
      users
        .map(
          (
            user,
            index,
          ) =>
            `${index + 1}. 🛠️ Admin\n   🆔 ${user.telegramId}`,
        )
        .join("\n\n");

    await ctx.editMessageText(
      lang === "fa"
        ? `👥 Adminها\n\n${userList}\n\nبرای مشاهده اطلاعات، روی کاربر بزنید.`
        : `👥 Admins\n\n${userList}\n\nPress a user to view their information.`,
      {
        reply_markup:
          keyboard,
      },
    );
  },
);

/**
 * Ask for Admin removal confirmation
 */
bot.callbackQuery(
  /^managed_remove_(\d+)$/,
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !hasPermission(
        role,
        "owner",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ فقط Owner می‌تواند Adminها را حذف کند."
              : "⛔ Only the Owner can remove Admins.",
          show_alert: true,
        },
      );

      return;
    }

    const match =
      ctx.callbackQuery.data.match(
        /^managed_remove_(\d+)$/,
      );

    if (!match) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ شناسه نامعتبر است."
              : "❌ Invalid ID.",
          show_alert: true,
        },
      );

      return;
    }

    const targetId =
      Number(match[1]);

    if (
      !Number.isSafeInteger(
        targetId,
      ) ||
      targetId <= 0
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ شناسه نامعتبر است."
              : "❌ Invalid ID.",
          show_alert: true,
        },
      );

      return;
    }

    if (
      targetId ===
      env.owner.telegramId
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ Owner قابل حذف نیست."
              : "⛔ The Owner cannot be removed.",
          show_alert: true,
        },
      );

      return;
    }

    const targetRole =
      getUserRole(
        targetId,
      );

    if (
      targetRole !==
      "admin"
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ این کاربر Admin نیست یا قبلاً حذف شده است."
              : "❌ This user is not an Admin or has already been removed.",
          show_alert: true,
        },
      );

      return;
    }

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      lang === "fa"
        ? [
            "⚠️ تأیید حذف دسترسی",
            "",
            `🆔 Telegram ID: ${targetId}`,
            "👤 نقش: 🛠️ Admin",
            "",
            "آیا مطمئن هستید که می‌خواهید دسترسی این کاربر را حذف کنید؟",
          ].join("\n")
        : [
            "⚠️ Confirm Access Removal",
            "",
            `🆔 Telegram ID: ${targetId}`,
            "👤 Role: 🛠️ Admin",
            "",
            "Are you sure you want to remove this user's access?",
          ].join("\n"),
      {
        reply_markup:
          new InlineKeyboard()
            .text(
              lang === "fa"
                ? "✅ بله، حذف شود"
                : "✅ Yes, Remove",
              `managed_confirm_remove_${targetId}`,
            )
            .row()
            .text(
              lang === "fa"
                ? "❌ لغو"
                : "❌ Cancel",
              "admin_list",
            ),
      },
    );
  },
);

/**
 * Confirm Admin removal
 */
bot.callbackQuery(
  /^managed_confirm_remove_(\d+)$/,
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !hasPermission(
        role,
        "owner",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ فقط Owner می‌تواند Adminها را حذف کند."
              : "⛔ Only the Owner can remove Admins.",
          show_alert: true,
        },
      );

      return;
    }

    const match =
      ctx.callbackQuery.data.match(
        /^managed_confirm_remove_(\d+)$/,
      );

    if (!match) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ شناسه نامعتبر است."
              : "❌ Invalid ID.",
          show_alert: true,
        },
      );

      return;
    }

    const targetId =
      Number(match[1]);

    if (
      !Number.isSafeInteger(
        targetId,
      ) ||
      targetId <= 0
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ شناسه نامعتبر است."
              : "❌ Invalid ID.",
          show_alert: true,
        },
      );

      return;
    }

    if (
      targetId ===
      env.owner.telegramId
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ Owner قابل حذف نیست."
              : "⛔ The Owner cannot be removed.",
          show_alert: true,
        },
      );

      return;
    }

    const targetRole =
      getUserRole(
        targetId,
      );

    if (
      targetRole !==
      "admin"
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ این کاربر دیگر Admin نیست."
              : "❌ This user is no longer an Admin.",
          show_alert: true,
        },
      );

      return;
    }

    try {
      removeUser(
        targetId,
      );

      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "✅ دسترسی Admin حذف شد."
              : "✅ Admin access removed.",
        },
      );

      const users =
        getManagedUsers().filter(
          (user) =>
            user.role ===
            "admin",
        );

      if (
        users.length === 0
      ) {
        await ctx.editMessageText(
          lang === "fa"
            ? "👥 Adminها\n\nهیچ Adminی باقی نمانده است."
            : "👥 Admins\n\nNo Admins remain.",
          {
            reply_markup:
              new InlineKeyboard()
                .text(
                  lang === "fa"
                    ? "🔙 بازگشت"
                    : "🔙 Back",
                  "settings_access",
                ),
          },
        );

        return;
      }

      const keyboard =
        new InlineKeyboard();

      for (
        const user of users
      ) {
        keyboard
          .text(
            `🛠️ Admin | ${user.telegramId}`,
            `managed_info_${user.telegramId}`,
          )
          .text(
            "❌",
            `managed_remove_${user.telegramId}`,
          )
          .row();
      }

      keyboard.text(
        lang === "fa"
          ? "🔙 بازگشت"
          : "🔙 Back",
        "settings_access",
      );

      const userList =
        users
          .map(
            (
              user,
              index,
            ) =>
              `${index + 1}. 🛠️ Admin\n   🆔 ${user.telegramId}`,
          )
          .join("\n\n");

      await ctx.editMessageText(
        lang === "fa"
          ? `👥 Adminها\n\n${userList}`
          : `👥 Admins\n\n${userList}`,
        {
          reply_markup:
            keyboard,
        },
      );
    } catch (error) {
      console.error(
        "Failed to remove Admin:",
        error,
      );

      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ حذف دسترسی با خطا مواجه شد."
              : "❌ Failed to remove Admin access.",
          show_alert: true,
        },
      );
    }
  },
);

/**
 * Show Admin information
 */
bot.callbackQuery(
  /^managed_info_(\d+)$/,
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !hasPermission(
        role,
        "owner",
      )
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "⛔ فقط Owner می‌تواند اطلاعات Adminها را ببیند."
              : "⛔ Only the Owner can view Admin information.",
          show_alert: true,
        },
      );

      return;
    }

    const match =
      ctx.callbackQuery.data.match(
        /^managed_info_(\d+)$/,
      );

    if (!match) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ شناسه نامعتبر است."
              : "❌ Invalid ID.",
          show_alert: true,
        },
      );

      return;
    }

    const targetId =
      Number(match[1]);

    if (
      !Number.isSafeInteger(
        targetId,
      ) ||
      targetId <= 0
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ شناسه نامعتبر است."
              : "❌ Invalid ID.",
          show_alert: true,
        },
      );

      return;
    }

    const targetRole =
      getUserRole(
        targetId,
      );

    if (
      targetRole !==
      "admin"
    ) {
      await ctx.answerCallbackQuery(
        {
          text:
            lang === "fa"
              ? "❌ این کاربر Admin نیست یا حذف شده است."
              : "❌ This user is not an Admin or has been removed.",
          show_alert: true,
        },
      );

      return;
    }

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      [
        lang === "fa"
          ? "👤 اطلاعات Admin"
          : "👤 Admin Information",
        "",
        `🆔 Telegram ID: ${targetId}`,
        lang === "fa"
          ? "🛠️ نقش: Admin"
          : "🛠️ Role: Admin",
        lang === "fa"
          ? "🔐 سطح دسترسی: مدیریت"
          : "🔐 Access Level: Management",
        "",
        lang === "fa"
          ? "این کاربر به عنوان Admin ثبت شده است."
          : "This user is registered as an Admin.",
      ].join("\n"),
      {
        reply_markup:
          new InlineKeyboard()
            .text(
              lang === "fa"
                ? "❌ حذف دسترسی"
                : "❌ Remove Access",
              `managed_remove_${targetId}`,
            )
            .row()
            .text(
              lang === "fa"
                ? "🔙 لیست Adminها"
                : "🔙 Admin List",
              "admin_list",
            ),
      },
    );
  },
);

/**
 * Normal user Subscription handler
 *
 * Normal users can send their
 * Marzban Subscription URL and
 * receive subscription information.
 */
bot.on(
  "message:text",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    if (
      isAuthorized(
        telegramId,
      )
    ) {
      return;
    }

    const input =
      ctx.message.text.trim();

    const subscriptionUrl =
      normalizeSubscriptionUrl(
        input,
      );

    if (
      !subscriptionUrl
    ) {
      await ctx.reply(
        "❌ لینک Subscription معتبر نیست.\n\n" +
          "لطفاً لینک Subscription مربوط به Marzban خود را ارسال کنید.",
      );

      return;
    }

    try {
      const info =
        await getSubscriptionInfo(
          subscriptionUrl,
        );

      const used =
        info.upload +
        info.download;

      const remaining =
        info.total > 0
          ? Math.max(
              info.total -
                used,
              0,
            )
          : null;

      const expire =
        info.expire
          ? formatDate(
              info.expire,
            )
          : "—";

      const profileTitle =
        info.profileTitle ??
        "Subscription";

      const text =
        [
          `📦 ${profileTitle}`,
          "",
          `📤 آپلود: ${formatBytes(info.upload)}`,
          `📥 دانلود: ${formatBytes(info.download)}`,
          `📊 مصرف کل: ${formatBytes(used)}`,
          `💾 حجم کل: ${
            info.total > 0
              ? formatBytes(
                  info.total,
                )
              : "نامحدود"
          }`,
          `📌 حجم باقی‌مانده: ${
            remaining === null
              ? "نامحدود"
              : formatBytes(
                  remaining,
                )
          }`,
          `📅 انقضا: ${expire}`,
          "",
          `🔗 لینک اشتراک:\n${subscriptionUrl}`,
        ].join("\n");

      await ctx.reply(
        text,
      );
    } catch (error) {
      console.error(
        "Failed to fetch subscription information:",
        error,
      );

      await ctx.reply(
        "❌ دریافت اطلاعات Subscription با خطا مواجه شد.\n\n" +
          "لطفاً مطمئن شوید لینک Subscription معتبر و فعال است.",
      );
    }
  },
);

/**
 * Handle Telegram ID submitted
 * for Admin creation.
 */
bot.on(
  "message:text",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    if (
      !pendingAdminAdd.has(
        telegramId,
      )
    ) {
      return;
    }

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !hasPermission(
        role,
        "owner",
      )
    ) {
      pendingAdminAdd.delete(
        telegramId,
      );

      await ctx.reply(
        lang === "fa"
          ? "⛔ فقط Owner می‌تواند Admin اضافه کند."
          : "⛔ Only the Owner can add Admins.",
      );

      return;
    }

    const targetId =
      Number(
        ctx.message.text.trim(),
      );

    if (
      !Number.isSafeInteger(
        targetId,
      ) ||
      targetId <= 0
    ) {
      await ctx.reply(
        lang === "fa"
          ? "❌ Telegram ID نامعتبر است.\nلطفاً فقط یک عدد معتبر ارسال کنید."
          : "❌ Invalid Telegram ID.\nPlease send a valid numeric Telegram ID.",
      );

      return;
    }

    if (
      targetId ===
      env.owner.telegramId
    ) {
      await ctx.reply(
        lang === "fa"
          ? "❌ Owner نمی‌تواند خودش را به عنوان Admin اضافه کند."
          : "❌ The Owner cannot add themselves as an Admin.",
      );

      return;
    }

    try {
      setUserRole(
        targetId,
        "admin",
      );

      pendingAdminAdd.delete(
        telegramId,
      );

      await ctx.reply(
        lang === "fa"
          ? [
              "✅ Admin با موفقیت اضافه شد.",
              "",
              `🆔 Telegram ID: ${targetId}`,
              "🛠️ نقش: Admin",
            ].join("\n")
          : [
              "✅ Admin added successfully.",
              "",
              `🆔 Telegram ID: ${targetId}`,
              "🛠️ Role: Admin",
            ].join("\n"),
        {
          reply_markup:
            new InlineKeyboard()
              .text(
                lang === "fa"
                  ? "🔐 مدیریت دسترسی‌ها"
                  : "🔐 Access Management",
                "settings_access",
              )
              .row()
              .text(
                lang === "fa"
                  ? "🏠 منوی اصلی"
                  : "🏠 Main Menu",
                "back_to_menu",
              ),
        },
      );
    } catch (error) {
      console.error(
        "Failed to add Admin:",
        error,
      );

      pendingAdminAdd.delete(
        telegramId,
      );

      await ctx.reply(
        lang === "fa"
          ? "❌ افزودن Admin با خطا مواجه شد."
          : "❌ Failed to add Admin.",
      );
    }
  },
);

/**
 * Language settings
 */
bot.callbackQuery(
  "settings_language",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    await ctx.answerCallbackQuery();

    const languageKeyboard =
      new InlineKeyboard()
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
        reply_markup:
          languageKeyboard,
      },
    );
  },
);

/**
 * Set Persian language
 */
bot.callbackQuery(
  "settings_set_lang_fa",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    userLanguages.set(
      telegramId,
      "fa",
    );

    await ctx.answerCallbackQuery();

    const languageKeyboard =
      new InlineKeyboard()
        .text(
          "🇮🇷 فارسی",
          "settings_set_lang_fa",
        )
        .row()
        .text(
          "🇬🇧 English",
          "settings_set_lang_en",
        )
        .row()
        .text(
          "🔙 بازگشت",
          "settings",
        );

    await ctx.editMessageText(
      "🌐 زبان\n\nزبان فعلی: 🇮🇷 فارسی",
      {
        reply_markup:
          languageKeyboard,
      },
    );
  },
);

/**
 * Set English language
 */
bot.callbackQuery(
  "settings_set_lang_en",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    userLanguages.set(
      telegramId,
      "en",
    );

    await ctx.answerCallbackQuery();

    const languageKeyboard =
      new InlineKeyboard()
        .text(
          "🇮🇷 Persian",
          "settings_set_lang_fa",
        )
        .row()
        .text(
          "🇬🇧 English",
          "settings_set_lang_en",
        )
        .row()
        .text(
          "🔙 Back",
          "settings",
        );

    await ctx.editMessageText(
      "🌐 Language\n\nCurrent language: 🇬🇧 English",
      {
        reply_markup:
          languageKeyboard,
      },
    );
  },
);

/**
 * User role settings
 */
bot.callbackQuery(
  "settings_role",
  async (ctx) => {
    const telegramId =
      ctx.from.id;

    const lang =
      userLanguages.get(
        telegramId,
      ) ?? "fa";

    await ctx.answerCallbackQuery();

    const role =
      getUserRole(
        telegramId,
      );

    if (
      !role ||
      (
        role !== "owner" &&
        role !== "admin"
      )
    ) {
      await ctx.editMessageText(
        lang === "fa"
          ? "⛔ نقش مدیریتی برای شما تعریف نشده است."
          : "⛔ You do not have a management role.",
        {
          reply_markup:
            new InlineKeyboard()
              .text(
                lang === "fa"
                  ? "🔙 بازگشت"
                  : "🔙 Back",
                "settings",
              ),
        },
      );

      return;
    }

    const roleInfo = {
      owner: {
        fa: [
          "👑 Owner",
          "دسترسی کامل به تمام امکانات ربات",
        ],
        en: [
          "👑 Owner",
          "Full access to all bot features",
        ],
      },

      admin: {
        fa: [
          "🛠️ Admin",
          "دسترسی مدیریتی به امکانات مجاز",
        ],
        en: [
          "🛠️ Admin",
          "Administrative access to permitted features",
        ],
      },
    } as const;

    const info =
      lang === "fa"
        ? roleInfo[role].fa
        : roleInfo[role].en;

    const title =
      lang === "fa"
        ? "👤 نقش کاربر"
        : "👤 User Role";

    const currentRole =
      lang === "fa"
        ? "نقش فعلی:"
        : "Current role:";

    await ctx.editMessageText(
      [
        title,
        "",
        `${currentRole} ${info[0]}`,
        "",
        info[0],
        info[1],
      ].join("\n"),
      {
        reply_markup:
          new InlineKeyboard()
            .text(
              lang === "fa"
                ? "🔙 بازگشت"
                : "🔙 Back",
              "settings",
            ),
      },
    );
  },
);

/**
 * Error handler
 */
bot.catch(
  (error) => {
    console.error(
      "Telegram bot error:",
      error,
    );
  },
);