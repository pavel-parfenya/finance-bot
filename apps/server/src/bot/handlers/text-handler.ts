import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser, getUserDisplayName } from "../utils";
import { parseMessage } from "../message-router";
import { handleParsedMessage } from "./message-handler";

const INVALID_REPLY =
  "Не удалось внести данные: информация невалидная (указана нулевая сумма или не распознано описание).";

export function createTextHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (ctx.message?.voice) return;
    const text = ctx.message?.text;
    if (!text || text.startsWith("/")) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    const displayName = getUserDisplayName(ctx);
    const defaultCurrency = await deps.userService.getDefaultCurrency(user.id);

    const parsed = await parseMessage(text, displayName, defaultCurrency, {
      debtParser: deps.debtParser,
      expenseService: deps.expenseService,
      purchaseAdviceParser: deps.purchaseAdviceParser,
    });

    if (!parsed) {
      await ctx.reply(INVALID_REPLY);
      return;
    }

    if (parsed.type === "expense") {
      await ctx.reply("Обрабатываю ваш расход...");
    }

    try {
      await handleParsedMessage(ctx, parsed, deps, {
        userId: user.id,
        displayName,
        originalText: text,
      });
    } catch (error) {
      console.error("Ошибка обработки сообщения:", error);
      await ctx.reply(
        "Не удалось обработать сообщение. Попробуйте ещё раз, например:\n" +
          "«Купил 3 пачки яиц за 5 BYN в Евроопте» или «Одолжил Саше 100р»"
      );
    }
  };
}
