# 🛡️ Marzban Sentinel

**دستیار مدیریت و مانیتورینگ Marzban از طریق Telegram**

[🇬🇧 English](README.md) | 🇮🇷 فارسی

Marzban Sentinel یک پروژه مبتنی بر **TypeScript** و **Node.js** است که یک رابط تلگرامی برای تعامل با **Marzban API** فراهم می‌کند.

این پروژه با معماری ماژولار، سیستم احراز هویت، پشتیبانی چندزبانه، مدیریت تنظیمات و یک Client اختصاصی برای Marzban طراحی شده و زیرساخت مناسبی برای توسعه قابلیت‌های مدیریتی و مانیتورینگ در آینده فراهم می‌کند.

## ✨ قابلیت‌ها

* 🤖 رابط کاربری مبتنی بر Telegram Bot
* 🔗 اتصال به Marzban API
* 🌐 پشتیبانی از زبان فارسی و انگلیسی
* 🔐 سیستم احراز هویت و کنترل دسترسی
* ⚙️ مدیریت تنظیمات از طریق Environment Variables
* 🧩 معماری ماژولار با TypeScript
* 🗄️ لایه Database
* 🛡️ ماژول اختصاصی برای بخش امنیت
* 📝 سیستم Logging قابل تنظیم
* 🚀 زیرساخت آماده برای توسعه قابلیت‌های مدیریت و مانیتورینگ

## 🧰 تکنولوژی‌ها

| تکنولوژی         | کاربرد            |
| ---------------- | ----------------- |
| TypeScript       | توسعه برنامه      |
| Node.js          | محیط اجرا         |
| Telegram Bot API | ارتباط با تلگرام  |
| Marzban API      | ارتباط با Marzban |
| JSON             | مدیریت ترجمه‌ها   |
| Git / GitHub     | مدیریت نسخه‌ها    |

## 📁 ساختار پروژه

```text
marzban-sentinel/
│
├── src/
│   ├── bot/
│   │   ├── bot.ts
│   │   ├── i18n.ts
│   │   └── menu.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── database/
│   │   └── db.ts
│   │
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── en.json
│   │       └── fa.json
│   │
│   ├── marzban/
│   │   ├── client.ts
│   │   └── types.ts
│   │
│   ├── security/
│   │   └── auth.ts
│   │
│   ├── telegram/
│   │   ├── api.ts
│   │   └── types.ts
│   │
│   └── index.ts
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```

## 📋 پیش‌نیازها

برای اجرای پروژه به موارد زیر نیاز دارید:

* Node.js
* npm
* Telegram Bot Token
* دسترسی به یک Marzban
* اطلاعات احراز هویت Marzban

## ⚙️ نصب

ابتدا Repository را Clone کنید:

```bash
git clone https://github.com/Ameerbaloe/marzban-sentinel.git
```

و وارد پوشه پروژه شوید:

```bash
cd marzban-sentinel
```

سپس Dependencies را نصب کنید:

```bash
npm install
```

## 🔐 تنظیمات

ابتدا از فایل نمونه، فایل `.env` ایجاد کنید.

### Linux / macOS

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

سپس فایل `.env` را باز کرده و اطلاعات واقعی خود را وارد کنید.

نمونه:

```env
# Telegram
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET=CHANGE_THIS_TO_A_RANDOM_SECRET

# Telegram ID of the first owner
OWNER_TELEGRAM_ID=123456789

# Marzban
MARZBAN_URL=https://panel.example.com/dashboard
MARZBAN_USERNAME=admin
MARZBAN_PASSWORD=CHANGE_ME

# Application
NODE_ENV=development
LOG_LEVEL=info
```

> ⚠️ **هشدار امنیتی:** فایل `.env`، توکن ربات تلگرام، رمز عبور Marzban، API Credentials و سایر اطلاعات حساس را هرگز در GitHub قرار ندهید.

## ▶️ اجرای پروژه

برای اجرای پروژه در حالت Development:

```bash
npm run dev
```

برای Build کردن پروژه:

```bash
npm run build
```

برای اجرای نسخه Build شده:

```bash
npm start
```

> دستورات قابل اجرا در فایل `package.json` تعریف شده‌اند.

## 🌐 سیستم چندزبانه

Marzban Sentinel در حال حاضر از زبان‌های زیر پشتیبانی می‌کند:

* 🇮🇷 فارسی
* 🇬🇧 انگلیسی

فایل‌های ترجمه در مسیر زیر قرار دارند:

```text
src/i18n/locales/
├── en.json
└── fa.json
```

ساختار Localization به شکلی طراحی شده است که اضافه کردن زبان‌های جدید در آینده ساده باشد.

## 🔐 امنیت

اطلاعات حساس پروژه از طریق Environment Variables دریافت می‌شوند و در Source Code قرار نمی‌گیرند.

قابلیت‌های مربوط به احراز هویت در ماژول زیر قرار گرفته‌اند:

```text
src/security/auth.ts
```

برای استفاده در محیط Production:

* فایل `.env` را خصوصی نگه دارید.
* Telegram Bot Token را منتشر نکنید.
* اطلاعات ورود Marzban را منتشر نکنید.
* از Secretهای قدرتمند استفاده کنید.
* دسترسی ربات را به کاربران مجاز محدود کنید.
* برای ارتباطات API در محیط Production از HTTPS استفاده کنید.

## 🧩 معماری پروژه

پروژه به بخش‌های مجزا برای مدیریت ارتباط با Telegram، احراز هویت، Localization، منطق برنامه و ارتباط با Marzban تقسیم شده است.

```text
Telegram
   │
   ▼
Bot Layer
   │
   ├── Authentication
   ├── Localization
   └── Menu / Interaction
   │
   ▼
Application Layer
   │
   ├── Configuration
   └── Database
   │
   ▼
Marzban API
```

این ساختار باعث می‌شود نگهداری پروژه و اضافه کردن قابلیت‌های جدید در آینده ساده‌تر باشد.

## 🛠️ وضعیت توسعه

**در حال توسعه اولیه**

Marzban Sentinel در حال توسعه فعال است.

معماری فعلی زیرساخت لازم برای اضافه کردن قابلیت‌های بیشتر در زمینه مدیریت، مانیتورینگ، اعلان‌ها و کنترل‌های مدیریتی را فراهم می‌کند.

با ادامه توسعه، ممکن است قابلیت‌ها و ساختار داخلی پروژه تغییر کند.

## 🗺️ نقشه راه

برخی از زمینه‌های برنامه‌ریزی‌شده برای توسعه آینده:

* [ ] توسعه قابلیت‌های مدیریت Marzban
* [ ] مدیریت کاربران و Subscriptionها
* [ ] مانیتورینگ سرور
* [ ] نمایش آمار مصرف و ترافیک
* [ ] سیستم اعلان و Alert در Telegram
* [ ] توسعه کنترل‌های مدیریتی
* [ ] اضافه کردن زبان‌های بیشتر

## 🤝 مشارکت در پروژه

از مشارکت، پیشنهادها و گزارش Bug استقبال می‌شود.

قبل از ارسال Pull Request لطفاً مطمئن شوید:

1. تغییرات با ساختار فعلی پروژه هماهنگ باشند.
2. اطلاعات حساس داخل Commit قرار نگرفته باشد.
3. قابلیت‌های جدید مستندسازی شده باشند.
4. عملکرد فعلی پروژه بدون دلیل دچار اختلال نشود.

## 📄 لایسنس

اطلاعات مربوط به License در نسخه‌های آینده پروژه اضافه خواهد شد.

---

⭐ اگر **Marzban Sentinel** برای شما مفید است، می‌توانید با Star کردن Repository از پروژه حمایت کنید.

[🇬🇧 مشاهده نسخه انگلیسی](README.md)
