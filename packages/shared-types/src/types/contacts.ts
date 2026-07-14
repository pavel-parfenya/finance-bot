/** Контактная информация из Strapi site-setting (Настройки → Контакты, лендинг /contacts). */
export interface ContactsInfo {
  email: string | null;
  /** Username поддержки в Telegram без «@». */
  telegramSupport: string | null;
}

export interface ContactsResponse extends ContactsInfo {
  error?: string;
}
