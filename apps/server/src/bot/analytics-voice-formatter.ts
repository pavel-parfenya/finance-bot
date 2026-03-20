import type { AnalyticsVoice, Insight, InsightType } from "../analytics/types";

type TemplateFn = (d: Insight["data"], voice: AnalyticsVoice) => string;

const TEMPLATES: Record<InsightType, TemplateFn> = {
  category_spike: (d, voice) => {
    const cat = d.category ?? "категория";
    const amt = d.amount ?? "—";
    const pct = d.percent ?? 0;
    const cur = d.currency ?? "BYN";
    switch (voice) {
      case "official":
        return `В этом месяце на «${cat}» ушло ${pct}% расходов (${amt} ${cur})`;
      case "strict":
        return `Внимание: категория «${cat}» составляет ${pct}% расходов. Рекомендуется пересмотреть траты.`;
      case "modern":
        return `Короче, на «${cat}» улетело ${pct}% бабла — ${amt} ${cur}, ну ты понял`;
      case "modern_18":
        return `Блин, на «${cat}» ушло ${pct}% всего — ${amt} ${cur}, да ты жришь как не в себя`;
      default:
        return TEMPLATES.category_spike(d, "official");
    }
  },
  month_forecast: (d, voice) => {
    const amt = d.amount ?? "—";
    const cur = d.currency ?? "BYN";
    switch (voice) {
      case "official":
        return `По текущему темпу к концу месяца будет ~${amt} ${cur}`;
      case "strict":
        return `Прогноз: к концу месяца расходы составят ~${amt} ${cur}. Контролируйте траты.`;
      case "modern":
        return `Короче, к концу месяца вылетишь на ~${amt} ${cur}, имей в виду`;
      case "modern_18":
        return `К концу месяца набежит ~${amt} ${cur}, так что смотри`;
      default:
        return TEMPLATES.month_forecast(d, "official");
    }
  },
  top_category: (d, voice) => {
    const cat = d.category ?? "категория";
    const amt = d.amount ?? "—";
    const cur = d.currency ?? "BYN";
    switch (voice) {
      case "official":
        return `Больше всего тратите на «${cat}» — ${amt} ${cur}`;
      case "strict":
        return `Основная статья расходов: «${cat}» (${amt} ${cur}).`;
      case "modern":
        return `Больше всего бабла уходит на «${cat}» — ${amt} ${cur}`;
      case "modern_18":
        return `Топ трат — «${cat}», ${amt} ${cur}`;
      default:
        return TEMPLATES.top_category(d, "official");
    }
  },
  vs_prev_month_total: (d, voice) => {
    const delta = d.deltaPercent ?? 0;
    const prev = d.prevAmount ?? "—";
    const curr = d.currentAmount ?? "—";
    const cur = d.currency ?? "BYN";
    const up = delta > 0;
    switch (voice) {
      case "official":
        return up
          ? `Расходы выросли на ${Math.abs(delta).toFixed(0)}% (было ${prev}, стало ${curr} ${cur})`
          : `Расходы снизились на ${Math.abs(delta).toFixed(0)}%`;
      case "strict":
        return up
          ? `Внимание: расходы выросли на ${Math.abs(delta).toFixed(0)}%. Было ${prev}, стало ${curr} ${cur}.`
          : `Расходы снизились на ${Math.abs(delta).toFixed(0)}%.`;
      case "modern":
        return up
          ? `Короче, траты выросли на ${Math.abs(delta).toFixed(0)}% — было ${prev}, стало ${curr} ${cur}`
          : `Траты упали на ${Math.abs(delta).toFixed(0)}%, красава`;
      case "modern_18":
        return up
          ? `Траты выросли на ${Math.abs(delta).toFixed(0)}%, было ${prev} — стало ${curr} ${cur}`
          : `Траты снизились на ${Math.abs(delta).toFixed(0)}%`;
      default:
        return TEMPLATES.vs_prev_month_total(d, "official");
    }
  },
  vs_prev_month_category: (d, voice) => {
    const cat = d.category ?? "категория";
    const delta = d.deltaAmount ?? "—";
    const cur = d.currency ?? "BYN";
    switch (voice) {
      case "official":
        return `На «${cat}» потратили на ${delta} ${cur} больше, чем в прошлом месяце`;
      case "strict":
        return `Рост по категории «${cat}»: +${delta} ${cur} к прошлому месяцу.`;
      case "modern":
        return `На «${cat}» улетело на ${delta} ${cur} больше, чем в прошлом месяце`;
      case "modern_18":
        return `«${cat}» — плюс ${delta} ${cur} к прошлому месяцу`;
      default:
        return TEMPLATES.vs_prev_month_category(d, "official");
    }
  },
};

/**
 * Форматирует инсайт в сообщение с учётом характера бота.
 */
export function formatInsight(insight: Insight, voice: AnalyticsVoice): string {
  const fn = TEMPLATES[insight.type];
  if (!fn) return "";
  return fn(insight.data, voice);
}
