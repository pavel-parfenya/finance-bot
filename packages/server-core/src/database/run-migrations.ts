import "reflect-metadata";
import { AppDataSource } from "./data-source.cli";

/**
 * Прод-запуск миграций по СКОМПИЛИРОВАННОМУ коду (dist), без ts-node.
 * Использует только production-зависимость typeorm — поэтому миграции можно
 * гонять рантайм-образом api (slim), а не отдельным тяжёлым dev-образом.
 */
AppDataSource.initialize()
  .then(async (ds) => {
    const applied = await ds.runMigrations();
    console.log(`Применено миграций: ${applied.length}`);
    await ds.destroy();
  })
  .catch((err) => {
    console.error("Ошибка миграций:", err);
    process.exit(1);
  });
