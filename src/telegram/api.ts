import { env } from "../config/env.js";
import type {
  TelegramApiResponse,
  TelegramUpdate
} from "./types.js";

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "TelegramApiError";
  }
}

export class TelegramApi {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl =
      `https://api.telegram.org/bot${env.telegram.botToken}`;
  }

  async call<T>(
    method: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body ?? {})
      }
    );

    const data =
      (await response.json()) as TelegramApiResponse<T>;

    if (!response.ok || !data.ok) {
      throw new TelegramApiError(
        data.description ??
          `Telegram API request failed with status ${response.status}`,
        response.status
      );
    }

    return data.result as T;
  }

  async sendMessage(
    chatId: number,
    text: string,
    replyMarkup?: unknown
  ): Promise<void> {
    await this.call(
      "sendMessage",
      {
        chat_id: chatId,
        text,
        ...(replyMarkup
          ? { reply_markup: replyMarkup }
          : {})
      }
    );
  }

  async getMe(): Promise<unknown> {
    return this.call("getMe");
  }

  async getUpdates(): Promise<TelegramUpdate[]> {
    return this.call<TelegramUpdate[]>(
      "getUpdates"
    );
  }
}