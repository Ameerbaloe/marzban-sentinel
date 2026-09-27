import { env } from "../config/env.js";
import type {
  MarzbanTokenResponse,
  MarzbanUserList,
  MarzbanUserResponse
} from "./types.js";

export class MarzbanApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "MarzbanApiError";
  }
}

export class MarzbanClient {
  private accessToken: string | null = null;

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${env.marzban.url}${path}`;

    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");

    if (this.accessToken) {
      headers.set(
        "Authorization",
        `Bearer ${this.accessToken}`
      );
    }

    if (options.body && !headers.has("Content-Type")) {
      headers.set(
        "Content-Type",
        "application/json"
      );
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const body = await response.text();

      throw new MarzbanApiError(
        `Marzban API request failed: ${response.status} ${body}`,
        response.status
      );
    }

    return response.json() as Promise<T>;
  }

  async login(): Promise<void> {
    const body = new URLSearchParams();

    body.set(
      "username",
      env.marzban.username
    );

    body.set(
      "password",
      env.marzban.password
    );

    body.set(
      "grant_type",
      "password"
    );

    const response = await fetch(
      `${env.marzban.url}/api/admin/token`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          Accept: "application/json"
        },
        body
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new MarzbanApiError(
        `Marzban authentication failed: ${response.status} ${errorText}`,
        response.status
      );
    }

    const data =
      (await response.json()) as MarzbanTokenResponse;

    this.accessToken = data.access_token;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken) {
      await this.login();
    }
  }

  async getUsers(): Promise<MarzbanUserList> {
    await this.ensureAuthenticated();

    try {
      return await this.request<MarzbanUserList>(
        "/api/users"
      );
    } catch (error) {
      if (
        error instanceof MarzbanApiError &&
        error.status === 401
      ) {
        this.accessToken = null;
        await this.login();

        return this.request<MarzbanUserList>(
          "/api/users"
        );
      }

      throw error;
    }
  }

  async getUser(
    username: string
  ): Promise<MarzbanUserResponse> {
    await this.ensureAuthenticated();

    return this.request<MarzbanUserResponse>(
      `/api/user/${encodeURIComponent(username)}`
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.login();
      await this.getUsers();

      return true;
    } catch {
      return false;
    }
  }
}