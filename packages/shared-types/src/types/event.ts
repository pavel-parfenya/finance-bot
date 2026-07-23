export type EventStatusDto = "active" | "settled";

/** Событие в списке (вкладка «События»). */
export interface EventDto {
  id: number;
  name: string;
  description: string;
  keywords: string;
  currency: string;
  status: EventStatusDto;
  /** Текущий пользователь — создатель события. */
  isCreator: boolean;
  memberCount: number;
  /** Сумма учитываемых трат текущего пользователя в валюте события. */
  myTotal: number;
  createdAt: string;
  settledAt: string | null;
}

/** Участник события. */
export interface EventMemberDto {
  userId: number;
  username: string | null;
  displayName: string;
  isCreator: boolean;
  isMe: boolean;
  /** Сумма учитываемых трат участника в валюте события (для раздела «все траты»). */
  total: number;
}

/** Трата, привязанная к событию. */
export interface EventTransactionDto {
  id: number;
  description: string;
  category: string;
  amount: number;
  currency: string;
  occurredAt: string;
  excludedFromEvent: boolean;
  userId: number;
  username: string | null;
  displayName: string;
  isMine: boolean;
  /** Сумма в валюте события (сконвертированная), если валюта траты отличается. */
  amountInEventCurrency: number;
}

/** Одна строка расчёта: кто кому сколько должен. */
export interface EventSettlementRow {
  fromUserId: number;
  fromName: string;
  toUserId: number;
  toName: string;
  amount: number;
  currency: string;
  /** По этой строке уже создан долг (кнопка «Создать долг» блокируется). */
  debtCreated?: boolean;
}

/** Детальная страница события. */
export interface EventDetailDto extends EventDto {
  creatorUserId: number;
  members: EventMemberDto[];
  /** Траты текущего пользователя (видны только ему). */
  myTransactions: EventTransactionDto[];
  /** Все траты события (видны всем участникам). */
  allTransactions: EventTransactionDto[];
  /** Итог расчёта (после «Завершить и рассчитать»). */
  settlement: EventSettlementRow[] | null;
}

export interface EventCreateRequest {
  name: string;
  description?: string;
  keywords?: string;
  /** Валюта события; по умолчанию — валюта профиля создателя. */
  currency?: string;
}

export interface EventUpdateRequest {
  name?: string;
  description?: string;
  keywords?: string;
}
