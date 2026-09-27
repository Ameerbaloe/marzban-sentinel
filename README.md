# 🛡️ Marzban Sentinel

**A Telegram-based management and monitoring assistant for Marzban.**

[🇮🇷 فارسی](README.fa.md) | 🇬🇧 English

Marzban Sentinel is a TypeScript/Node.js project that provides a Telegram-based interface for interacting with the Marzban API.

The project is designed with a modular architecture, authentication, localization, configuration management, and a dedicated Marzban API client to provide a solid foundation for future management and monitoring features.

## ✨ Features

* 🤖 Telegram Bot interface
* 🔗 Marzban API integration
* 🌐 English and Persian (Farsi) localization
* 🔐 Authentication and access control
* ⚙️ Environment-based configuration
* 🧩 Modular TypeScript architecture
* 🗄️ Database layer
* 🛡️ Dedicated security module
* 📝 Configurable logging
* 🚀 Designed for future monitoring and management features

## 🧰 Tech Stack

| Technology       | Purpose                 |
| ---------------- | ----------------------- |
| TypeScript       | Application development |
| Node.js          | Runtime environment     |
| Telegram Bot API | Telegram communication  |
| Marzban API      | Marzban integration     |
| JSON             | Localization            |
| Git / GitHub     | Version control         |

## 📁 Project Structure

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

## 📋 Requirements

Before running the project, make sure you have:

* Node.js
* npm
* A Telegram Bot Token
* Access to a Marzban installation
* Marzban credentials

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/Ameerbaloe/marzban-sentinel.git
```

Navigate to the project directory:

```bash
cd marzban-sentinel
```

Install dependencies:

```bash
npm install
```

## 🔐 Configuration

Create a `.env` file from the example configuration:

### Linux / macOS

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Then edit `.env` and provide your actual configuration.

Example:

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

> ⚠️ **Security:** Never commit your real `.env` file, Telegram Bot Token, Marzban password, API credentials, or other sensitive information to GitHub.

## ▶️ Running the Project

Start the project in development mode:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run the built application:

```bash
npm start
```

> Available npm scripts are defined in `package.json`.

## 🌐 Localization

Marzban Sentinel currently supports:

* 🇬🇧 English
* 🇮🇷 Persian (Farsi)

Localization files are located in:

```text
src/i18n/locales/
├── en.json
└── fa.json
```

The localization structure is designed to make adding additional languages straightforward.

## 🔐 Security

Sensitive configuration is loaded through environment variables instead of being hard-coded into the source code.

Authentication-related functionality is separated into:

```text
src/security/auth.ts
```

For production deployments:

* Keep `.env` private.
* Never expose Telegram Bot Tokens.
* Never expose Marzban credentials.
* Use strong secrets.
* Restrict bot access to authorized users.
* Use HTTPS for production API communication.

## 🧩 Architecture

The project separates Telegram interaction, authentication, localization, application logic, and Marzban communication into dedicated modules.

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

This structure makes the project easier to maintain and extend as new features are introduced.

## 🛠️ Development Status

**Early Development**

Marzban Sentinel is actively being developed.

The current architecture provides the foundation for additional administration, monitoring, notification, and management capabilities.

Features and internal architecture may change as development continues.

## 🗺️ Roadmap

Planned areas of development may include:

* [ ] Extended Marzban management
* [ ] User and subscription management
* [ ] Server monitoring
* [ ] Usage and traffic statistics
* [ ] Telegram notifications and alerts
* [ ] Improved administrative controls
* [ ] Additional localization support

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

Before submitting a pull request, please make sure that:

1. Your changes follow the existing project structure.
2. Sensitive credentials are not included.
3. New functionality is properly documented.
4. Existing functionality is not unnecessarily broken.

## 📄 License

License information will be added in a future release.

---

⭐ If you find **Marzban Sentinel** useful, consider starring the repository.

[🇮🇷 مشاهده نسخه فارسی](README.fa.md)
