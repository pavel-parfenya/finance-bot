export type AnalyticsVoice = "official" | "strict" | "modern" | "modern_18";

export interface UserSettings {
  defaultCurrency?: string | null;
  analyticsReminderEod?: boolean;
  analyticsMonthReport?: boolean;
  analyticsForecastWeekly?: boolean;
  /** IANA, напр. Europe/Moscow */
  analyticsTimezone?: string | null;
  analyticsVoice?: AnalyticsVoice;
  isSuperAdmin?: boolean;
  /** PAYMENT_MODE=paid|test: показывать раздел «Подписка» в настройках Mini App. */
  subscriptionEnabled?: boolean;
  error?: string;
}
