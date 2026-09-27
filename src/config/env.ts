import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z
    .string()
    .min(10, "TELEGRAM_BOT_TOKEN is required"),

  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .min(
      16,
      "TELEGRAM_WEBHOOK_SECRET must be at least 16 characters",
    ),

  OWNER_TELEGRAM_ID: z
    .string()
    .regex(
      /^\d+$/,
      "OWNER_TELEGRAM_ID must contain only numbers",
    ),

  MARZBAN_URL: z
    .string()
    .url("MARZBAN_URL must be a valid URL")
    .transform((value) =>
      value.replace(/\/+$/, ""),
    ),

  MARZBAN_SUBSCRIPTION_URL: z
    .string()
    .url(
      "MARZBAN_SUBSCRIPTION_URL must be a valid URL",
    )
    .transform((value) =>
      value.replace(/\/+$/, ""),
    ),

  MARZBAN_USERNAME: z
    .string()
    .min(1, "MARZBAN_USERNAME is required"),

  MARZBAN_PASSWORD: z
    .string()
    .min(1, "MARZBAN_PASSWORD is required"),

  NODE_ENV: z
    .enum([
      "development",
      "production",
      "test",
    ])
    .default("development"),

  LOG_LEVEL: z
    .enum([
      "debug",
      "info",
      "warn",
      "error",
    ])
    .default("info"),
});

const parsed = envSchema.safeParse(
  process.env,
);

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
  );

  for (const issue of parsed.error.issues) {
    console.error(
      `- ${issue.path.join(".")}: ${issue.message}`,
    );
  }

  process.exit(1);
}

export const env = {
  telegram: {
    botToken:
      parsed.data.TELEGRAM_BOT_TOKEN,

    webhookSecret:
      parsed.data.TELEGRAM_WEBHOOK_SECRET,
  },

  owner: {
    telegramId: Number(
      parsed.data.OWNER_TELEGRAM_ID,
    ),
  },

  marzban: {
    url: parsed.data.MARZBAN_URL,

    subscriptionUrl:
      parsed.data.MARZBAN_SUBSCRIPTION_URL,

    username:
      parsed.data.MARZBAN_USERNAME,

    password:
      parsed.data.MARZBAN_PASSWORD,
  },

  app: {
    nodeEnv:
      parsed.data.NODE_ENV,

    logLevel:
      parsed.data.LOG_LEVEL,
  },
} as const;