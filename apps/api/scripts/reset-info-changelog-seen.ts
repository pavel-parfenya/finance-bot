/**
 * Сбрасывает у всех пользователей отметку «прочитано» для блока инфо
 * (infoChangelogSeenVersion = 0). После деплоя с новым INFO_CHANGELOG_VERSION
 * все снова увидят индикатор «нового».
 *
 * Запуск из каталога apps/api при заданном DATABASE_URL:
 *   npx tsx scripts/reset-info-changelog-seen.ts
 */
import { initDatabase, UserService } from "@finance-bot/server-core";

async function main() {
  const ds = await initDatabase();
  const userService = new UserService(ds);
  await userService.resetAllInfoChangelogSeen();
  console.log("Готово: у всех пользователей infoChangelogSeenVersion = 0");
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
