declare module "apps-bot/attach-http" {
  import type { Application } from "express";
  import type { Bot } from "grammy";
  export function attachTelegramBotHttpRoutes(app: Application, bot: Bot): void;
}

declare module "apps-bot/bot" {
  import type { Bot } from "grammy";
  export function createBot(token: string, depsWithoutBot: unknown): Bot;
}

declare module "apps-bot/bootstrap-bot" {
  import type { Bot } from "grammy";
  import type { CoreServices } from "@finance-bot/server-core";
  export function configureBotAfterInit(bot: Bot, core: CoreServices): Promise<void>;
}
