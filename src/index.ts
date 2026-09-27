import { env } from "./config/env.js";
import { MarzbanClient } from "./marzban/client.js";
import { TelegramApi } from "./telegram/api.js";
import { bot } from "./bot/bot.js";

async function main(): Promise<void> {
  console.log("=================================");
  console.log("      Marzban Sentinel");
  console.log("=================================");
  console.log("");

  console.log(
    `Environment: ${env.app.nodeEnv}`
  );

  const telegram = new TelegramApi();
  const marzban = new MarzbanClient();

  try {
    console.log(
      "Checking Telegram connection..."
    );

    const telegramMe =
      await telegram.getMe();

    console.log(
      "Telegram connection: OK"
    );

    console.log(
      telegramMe
    );
  } catch (error) {
    console.error(
      "Telegram connection failed:",
      error
    );

    process.exit(1);
  }

  try {
    console.log(
      "Checking Marzban connection..."
    );

    const connected =
      await marzban.testConnection();

    if (!connected) {
      throw new Error(
        "Marzban connection failed"
      );
    }

    console.log(
      "Marzban connection: OK"
    );
  } catch (error) {
    console.error(
      "Marzban connection failed:",
      error
    );

    process.exit(1);
  }

  console.log("");
  console.log(
    "All initial connection tests passed."
  );

  console.log("");
  console.log("Starting Telegram bot...");

  bot.start();

  console.log("Telegram bot started");

}
main().catch((error) => {
  console.error(
    "Fatal application error:",
    error
  );

  process.exit(1);
});