import { Injectable } from "@nestjs/common";
import { config } from "@finance-bot/server-core";

@Injectable()
export class AppConfigService {
  get apiMode(): "normal" | "test" {
    return config.apiMode;
  }

  /** Задан при `API_MODE=test` (обязателен в этом режиме). */
  get testTelegramUserId(): number | null {
    return config.testTelegramUserId;
  }

  /** Подмена авторизации Mini App: запросы как у пользователя с этим telegram id. */
  get isTestApiAuth(): boolean {
    return config.apiMode === "test" && config.testTelegramUserId != null;
  }
}
