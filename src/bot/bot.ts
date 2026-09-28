/** marzban-sentinel  **/
import { Bot, InlineKeyboard } from "grammy";
import { env } from "../config/env.js";
import { MarzbanClient } from "../marzban/client.js";
import {
  getUserRole,
  hasPermission,
  isAuthorized,
  setUserRole,
} from "../security/auth.js";
import {getAdmins , removeUser,} from "../database/db.js";


import { languageMenu, mainMenu } from "./menu.js";
import { Language, t } from "./i18n.js";

const userLanguages = new Map<number, Language>();

const marzban = new MarzbanClient();


const pendingAdminAdd = new Set<number>();

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
      reply_markup: settingsKeyboard,
    },
  );
});


/**
 * Access management
 */
bot.callbackQuery("settings_access", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  const role = getUserRole(telegramId);

  if (!hasPermission(role, "owner")) {
    await ctx.answerCallbackQuery({
      text:
        lang === "fa"
          ? "⛔ فقط Owner به این بخش دسترسی دارد."
          : "⛔ Only the Owner can access this section.",
      show_alert: true,
    });

    return;
  }

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    lang === "fa"
      ? "🔐 مدیریت دسترسی‌ها"
      : "🔐 Access Management",
    {
      reply_markup: new InlineKeyboard()
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
});


/**
 * Start adding an Admin
 */
bot.callbackQuery("admin_add", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  const role = getUserRole(telegramId);

  if (!hasPermission(role, "owner")) {
    await ctx.answerCallbackQuery({
      text:
        lang === "fa"
          ? "⛔ فقط Owner می‌تواند Admin اضافه کند."
          : "⛔ Only the Owner can add Admins.",
      show_alert: true,
    });

    return;
  }

  pendingAdminAdd.add(telegramId);

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    lang === "fa"
      ? "➕ افزودن Admin\n\nلطفاً Telegram ID کاربر را ارسال کنید.\n\nمثال:\n123456789"
      : "➕ Add Admin\n\nPlease send the user's Telegram ID.\n\nExample:\n123456789",
    {
      reply_markup: new InlineKeyboard().text(
        lang === "fa"
          ? "❌ لغو"
          : "❌ Cancel",
        "settings_access",
      ),
    },
  );
});


/**
 * Show Admin list
 */
bot.callbackQuery("admin_list", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  const role = getUserRole(telegramId);

  if (!hasPermission(role, "owner")) {
    await ctx.answerCallbackQuery({
      text:
        lang === "fa"
          ? "⛔ فقط Owner می‌تواند لیست Adminها را ببیند."
          : "⛔ Only the Owner can view the Admin list.",
      show_alert: true,
    });

    return;
  }

  await ctx.answerCallbackQuery();

  const admins = getAdmins();

  if (admins.length === 0) {
    await ctx.editMessageText(
      lang === "fa"
        ? "👥 لیست Adminها\n\nهیچ Adminی ثبت نشده است."
        : "👥 Admin List\n\nNo Admins have been registered yet.",
      {
        reply_markup: new InlineKeyboard()
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

  const keyboard = new InlineKeyboard();

  for (const admin of admins) {
    keyboard
      .text(
        `🆔 ${admin.telegramId}`,
        `admin_info_${admin.telegramId}`,
      )
      .text(
        "❌",
        `admin_remove_${admin.telegramId}`,
      )
      .row();
  }

  keyboard.text(
    lang === "fa"
      ? "🔙 بازگشت"
      : "🔙 Back",
    "settings_access",
  );

  const adminList = admins
    .map(
      (admin, index) =>
        `${index + 1}. 🆔 ${admin.telegramId}`,
    )
    .join("\n");

  await ctx.editMessageText(
    lang === "fa"
      ? `👥 لیست Adminها\n\n${adminList}\n\nبرای حذف، روی ❌ کنار Admin موردنظر بزنید.`
      : `👥 Admin List\n\n${adminList}\n\nPress ❌ next to an Admin to remove them.`,
    {
      reply_markup: keyboard,
    },
  );
});

/**
 * Ask for Admin removal confirmation
 */
bot.callbackQuery(
  /^admin_remove_(\d+)$/,
  async (ctx) => {
    const telegramId = ctx.from.id;
    const lang =
      userLanguages.get(telegramId) ?? "fa";

    const role = getUserRole(telegramId);

    if (!hasPermission(role, "owner")) {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "⛔ فقط Owner می‌تواند Admin حذف کند."
            : "⛔ Only the Owner can remove Admins.",
        show_alert: true,
      });

      return;
    }

    const match =
      ctx.callbackQuery.data.match(
        /^admin_remove_(\d+)$/,
      );

    if (!match) {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "❌ شناسه نامعتبر است."
            : "❌ Invalid ID.",
        show_alert: true,
      });

      return;
    }

    const targetId = Number(match[1]);

    if (
      !Number.isSafeInteger(targetId) ||
      targetId <= 0
    ) {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "❌ شناسه نامعتبر است."
            : "❌ Invalid ID.",
        show_alert: true,
      });

      return;
    }

    if (targetId === env.owner.telegramId) {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "⛔ Owner قابل حذف نیست."
            : "⛔ The Owner cannot be removed.",
        show_alert: true,
      });

      return;
    }

    const targetRole =
      getUserRole(targetId);

    if (targetRole !== "admin") {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "❌ این کاربر Admin نیست یا قبلاً حذف شده است."
            : "❌ This user is not an Admin or has already been removed.",
        show_alert: true,
      });

      return;
    }

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      lang === "fa"
        ? [
            "⚠️ تأیید حذف Admin",
            "",
            `🆔 Telegram ID: ${targetId}`,
            "",
            "آیا مطمئن هستید که می‌خواهید دسترسی Admin این کاربر را حذف کنید؟",
          ].join("\n")
        : [
            "⚠️ Confirm Admin Removal",
            "",
            `🆔 Telegram ID: ${targetId}`,
            "",
            "Are you sure you want to remove this user's Admin access?",
          ].join("\n"),
      {
        reply_markup:
          new InlineKeyboard()
            .text(
              lang === "fa"
                ? "✅ بله، حذف شود"
                : "✅ Yes, Remove",
              `admin_confirm_remove_${targetId}`,
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
  /^admin_confirm_remove_(\d+)$/,
  async (ctx) => {
    const telegramId = ctx.from.id;
    const lang =
      userLanguages.get(telegramId) ?? "fa";

    const role = getUserRole(telegramId);

    if (!hasPermission(role, "owner")) {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "⛔ فقط Owner می‌تواند Admin حذف کند."
            : "⛔ Only the Owner can remove Admins.",
        show_alert: true,
      });

      return;
    }

    const match =
      ctx.callbackQuery.data.match(
        /^admin_confirm_remove_(\d+)$/,
      );

    if (!match) {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "❌ شناسه نامعتبر است."
            : "❌ Invalid ID.",
        show_alert: true,
      });

      return;
    }

    const targetId = Number(match[1]);

    if (
      !Number.isSafeInteger(targetId) ||
      targetId <= 0
    ) {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "❌ شناسه نامعتبر است."
            : "❌ Invalid ID.",
        show_alert: true,
      });

      return;
    }

    if (targetId === env.owner.telegramId) {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "⛔ Owner قابل حذف نیست."
            : "⛔ The Owner cannot be removed.",
        show_alert: true,
      });

      return;
    }

    const targetRole =
      getUserRole(targetId);

    if (targetRole !== "admin") {
      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "❌ این کاربر دیگر Admin نیست."
            : "❌ This user is no longer an Admin.",
        show_alert: true,
      });

      return;
    }

    try {
      removeUser(targetId);

      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "✅ دسترسی Admin حذف شد."
            : "✅ Admin access removed.",
      });

      const admins = getAdmins();

      if (admins.length === 0) {
        await ctx.editMessageText(
          lang === "fa"
            ? "👥 لیست Adminها\n\nهیچ Adminی باقی نمانده است."
            : "👥 Admin List\n\nNo Admins remain.",
          {
            reply_markup:
              new InlineKeyboard().text(
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

      for (const admin of admins) {
        keyboard
          .text(
            `🆔 ${admin.telegramId}`,
            `admin_info_${admin.telegramId}`,
          )
          .text(
            "❌",
            `admin_remove_${admin.telegramId}`,
          )
          .row();
      }

      keyboard.text(
        lang === "fa"
          ? "🔙 بازگشت"
          : "🔙 Back",
        "settings_access",
      );

      const adminList = admins
        .map(
          (admin, index) =>
            `${index + 1}. 🆔 ${admin.telegramId}`,
        )
        .join("\n");

      await ctx.editMessageText(
        lang === "fa"
          ? `👥 لیست Adminها\n\n${adminList}`
          : `👥 Admin List\n\n${adminList}`,
        {
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      console.error(
        "Failed to remove Admin:",
        error,
      );

      await ctx.answerCallbackQuery({
        text:
          lang === "fa"
            ? "❌ حذف Admin با خطا مواجه شد."
            : "❌ Failed to remove Admin.",
        show_alert: true,
      });
    }
  },
);

/**
 * Handle Telegram ID submitted for Admin creation
 */
bot.on("message:text", async (ctx) => {
  const telegramId = ctx.from.id;

  if (!pendingAdminAdd.has(telegramId)) {
    return;
  }

  const lang = userLanguages.get(telegramId) ?? "fa";

  const role = getUserRole(telegramId);

  if (!hasPermission(role, "owner")) {
    pendingAdminAdd.delete(telegramId);

    await ctx.reply(
      lang === "fa"
        ? "⛔ فقط Owner می‌تواند Admin اضافه کند."
        : "⛔ Only the Owner can add Admins.",
    );

    return;
  }

  const targetId = Number(
    ctx.message.text.trim(),
  );

  if (
    !Number.isSafeInteger(targetId) ||
    targetId <= 0
  ) {
    await ctx.reply(
      lang === "fa"
        ? "❌ Telegram ID نامعتبر است.\nلطفاً فقط یک عدد معتبر ارسال کنید."
        : "❌ Invalid Telegram ID.\nPlease send a valid numeric Telegram ID.",
    );

    return;
  }

  if (targetId === telegramId) {
    await ctx.reply(
      lang === "fa"
        ? "❌ Owner نمی‌تواند خودش را Admin کند."
        : "❌ The Owner cannot add themselves as Admin.",
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
 * User role settings
 */
bot.callbackQuery("settings_role", async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages.get(telegramId) ?? "fa";

  await ctx.answerCallbackQuery();

  const role = getUserRole(telegramId);

  if (!role) {
    await ctx.editMessageText(
      lang === "fa"
        ? "⛔ نقش کاربری شما مشخص نیست."
        : "⛔ Your user role could not be determined.",
      {
        reply_markup: new InlineKeyboard().text(
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

    viewer: {
      fa: [
        "👁️ Viewer",
        "فقط دسترسی مشاهده",
      ],
      en: [
        "👁️ Viewer",
        "Read-only access",
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
      reply_markup: new InlineKeyboard().text(
        lang === "fa"
          ? "🔙 بازگشت"
          : "🔙 Back",
        "settings",
      ),
    },
  );
});``



/**
 * Error handler
 */
bot.catch((error) => {
  console.error(
    "Telegram bot error:",
    error,
  );
});