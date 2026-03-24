/**
 * Сбрасывает у всех пользователей отметку «прочитано» для блока инфо
 * (infoChangelogSeenVersion = 0). После деплоя с новым INFO_CHANGELOG_VERSION
 * все снова увидят индикатор «нового».
 *
 * Запуск: из каталога apps/server при заданном DATABASE_URL:
 *   npx tsx scripts/reset-info-changelog-seen.ts
 */
import "reflect-metadata";
import path from "node:path";
import dotenv from "dotenv";
import { createDataSource } from "../src/database/data-source";
import { UserService } from "../src/services/user-service";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    console.error("Укажите DATABASE_URL в окружении или .env");
    process.exit(1);
  }
  const ds = createDataSource({ url });
  await ds.initialize();
  const userService = new UserService(ds);
  await userService.resetAllInfoChangelogSeen();
  console.log("Готово: у всех пользователей infoChangelogSeenVersion = 0");
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
