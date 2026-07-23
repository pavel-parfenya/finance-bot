export interface DebtDto {
  id: number;
  debtorName: string;
  creditorName: string;
  debtorUserId: number | null;
  creditorUserId: number | null;
  debtorUsername?: string | null;
  creditorUsername?: string | null;
  amount: number;
  currency: string;
  lentDate: string | null;
  deadline: string | null;
  repaidAmount: number;
  status: "pending" | "active";
  comment?: string | null;
  isMain: boolean; // может ли текущий пользователь управлять (любой участник — должник или кредитор)
  isCreditor: boolean; // текущий пользователь — кредитор (мне должны)
  createdAt: string;
}

export interface DebtCreateRequest {
  /** true = мне должны (я кредитор), false = я должен */
  iAmCreditor: boolean;
  debtorName: string;
  creditorName: string;
  /** @username для привязки к любому пользователю Telegram */
  debtorUsername?: string | null;
  creditorUsername?: string | null;
  amount: number;
  currency: string;
  lentDate?: string | null;
  deadline?: string | null;
  repaidAmount?: number;
  comment?: string | null;
}

export interface DebtUpdateRequest {
  debtorName?: string;
  creditorName?: string;
  /** @username для привязки к любому пользователю Telegram */
  debtorUsername?: string | null;
  creditorUsername?: string | null;
  amount?: number;
  currency?: string;
  lentDate?: string | null;
  deadline?: string | null;
  repaidAmount?: number;
}
