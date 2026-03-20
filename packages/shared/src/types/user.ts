export type AnalyticsVoice = "official" | "strict" | "modern" | "modern_18";

export interface UserSettings {
  defaultCurrency?: string | null;
  analyticsEnabled?: boolean;
  analyticsVoice?: AnalyticsVoice;
  error?: string;
}
