/** Пользователь, авторизованный через billing-JWT (бот → лендинг → API). */
export interface BillingUser {
  userId: number;
  telegramId: number;
  username: string | null;
}
