import { Bot } from "grammy";
import { ExpenseService } from "../services/expense-service";
import { createTextHandler } from "./handlers/text-handler";
import { createVoiceHandler } from "./handlers/voice-handler";

export function createBot(
  token: string,
  expenseService: ExpenseService
): Bot {
  const bot = new Bot(token);

  bot.command("start", (ctx) =>
    ctx.reply(
      "Привет! Я бот для учёта расходов.\n\n" +
        "Отправь мне текстовое или голосовое сообщение с описанием траты, " +
        "и я запишу его в Google Таблицу.\n\n" +
        'Пример: "Купил 3 пачки яиц за 150₽ в Пятёрочке"'
    )
  );

  bot.on("message:voice", createVoiceHandler(expenseService));
  bot.on("message:text", createTextHandler(expenseService));

  bot.catch((err) => {
    console.error("Ошибка бота:", err);
  });

  return bot;
}
