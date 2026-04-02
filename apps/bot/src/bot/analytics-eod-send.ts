import type { Bot } from "grammy";
import { subHours } from "date-fns";
import type {
  DeepSeekEndOfDayReminder,
  TransactionRepository,
  UserService,
  WorkspaceService,
} from "@finance-bot/server-core";

export interface EndOfDayReminderSendDeps {
  userService: UserService;
  workspaceService: WorkspaceService;
  transactionRepo: TransactionRepository;
  bot: Bot;
  endOfDayReminderGenerator: DeepSeekEndOfDayReminder;
}

/** Напоминание внести траты (есть история, но нет операций за 24ч). */
export async function sendEndOfDayReminderForUserId(
  userId: number,
  deps: EndOfDayReminderSendDeps,
  options: { localYmd: string; telegramId: number; forDevTest?: boolean }
): Promise<void> {
  const user = await deps.userService.findById(userId);
  if (!user?.analyticsReminderEod && !options.forDevTest) return;

  const workspaceIds = await deps.workspaceService.getWorkspaceIdsForUser(userId);
  if (workspaceIds.length === 0 && !options.forDevTest) return;

  if (!options.forDevTest && workspaceIds.length > 0) {
    const hasAny = await deps.transactionRepo.existsAnyForWorkspaceIds(workspaceIds);
    if (!hasAny) return;

    const since = subHours(new Date(), 24);
    const hasRecent = await deps.transactionRepo.existsForWorkspaceIdsOccurredAfter(
      workspaceIds,
      since
    );
    if (hasRecent) return;
  }

  const voice = await deps.userService.getAnalyticsVoice(userId);
  const message = await deps.endOfDayReminderGenerator.generate(voice);
  await deps.bot.api.sendMessage(Number(options.telegramId), message);
  if (!options.forDevTest) {
    await deps.userService.setLastAnalyticsReminderLocalDate(userId, options.localYmd);
  }
}
