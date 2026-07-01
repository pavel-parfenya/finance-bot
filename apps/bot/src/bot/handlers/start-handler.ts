import { Context } from "grammy";
import { config, resolveEffectivePlan } from "@finance-bot/server-core";
import type { SubscriptionPlanCard } from "@finance-bot/shared";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";
import { createCurrencyKeyboard } from "./currency-handler";
import { buildUpgradeKeyboard } from "./upgrade-prompt";

/** Тариф для витрины преимуществ: сначала «популярный», иначе первый платный. */
function pickShowcasePlan(
  plans: SubscriptionPlanCard[] | null
): SubscriptionPlanCard | null {
  if (!plans || plans.length === 0) return null;
  const paid = plans.filter((p) => p.planId && p.planId !== "free");
  if (paid.length === 0) return null;
  return paid.find((p) => p.isPopular) ?? paid[0];
}

/**
 * Онбординг-оффер подписки прямо на /start: показывает преимущества платного
 * тарифа и кнопку открытия страницы подписки в Mini App. Отправляется отдельным
 * сообщением после приветствия. Тихо пропускается, если:
 *  - монетизация выключена (`paymentMode === "free"`),
 *  - пользователь уже на действующем платном тарифе (не спамим),
 *  - нет HTTPS Mini App для web_app-кнопки.
 *
 * Список преимуществ берётся из Strapi (источник истины тарифов) — без него
 * оффер всё равно показывается, но без буллетов с фичами.
 */
async function maybeSendSubscriptionOffer(
  ctx: Context,
  deps: BotDeps,
  userId: number
): Promise<void> {
  if (config.paymentMode === "free") return;

  const sub = await deps.subscriptionService.getCurrentOrFree(userId);
  if ((resolveEffectivePlan(sub) as string) !== "free") return; // уже платит

  const keyboard = buildUpgradeKeyboard(deps, "💎 Оформить подписку");
  if (!keyboard) return; // нет HTTPS Mini App — оффер без кнопки бесполезен

  const showcase = pickShowcasePlan(await deps.featureService.getPlans());
  const benefits = showcase?.features
    ?.slice(0, 6)
    .map((f) => `✓ ${f.label}`)
    .join("\n");

  const lines = ["✨ Оформите подписку — и возможностей станет больше", ""];
  if (benefits) {
    lines.push("Что вы получите:", benefits, "");
  }
  lines.push("Оформить можно прямо здесь, в пару касаний 👇");

  await ctx.reply(lines.join("\n"), { reply_markup: keyboard });
}

export function createStartHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const user = await resolveUser(ctx, deps.userService);
    if (!user) {
      await ctx.reply("Не удалось определить пользователя. Попробуйте ещё раз.");
      return;
    }

    const workspace = await deps.workspaceService.getWorkspaceForUser(user.id);
    const hasWorkspace = !!workspace;
    const defaultCurrency = await deps.userService.getDefaultCurrency(user.id);

    const text = hasWorkspace
      ? `С возвращением! Отправляйте текстовые или голосовые сообщения о тратах — всё сохраняется.\n\n` +
        "Пример: «Купил яиц за 5 BYN» или «Получил зарплату 5000 BYN»\n\n" +
        (defaultCurrency
          ? `Валюта по умолчанию: ${defaultCurrency}. Нажмите кнопку ниже, чтобы изменить.\n\n`
          : "Выберите валюту по умолчанию:\n\n") +
        "Подробнее: /help"
      : "Привет! Я бот для учёта расходов.\n\n" +
        "Отправляйте текстовые или голосовые сообщения о тратах — бот сохранит их.\n\n" +
        "Выберите валюту по умолчанию (можно изменить в настройках приложения):\n\n" +
        "Пример: «Купил яиц за 5 BYN» или «Получил зарплату 5000 BYN»\n\n" +
        "Подробнее: /help";

    await ctx.reply(text, {
      reply_markup: createCurrencyKeyboard(),
    });

    await maybeSendSubscriptionOffer(ctx, deps, user.id);
  };
}
