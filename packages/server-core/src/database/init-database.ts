import type { DataSource } from "typeorm";
import { config } from "../config";
import { createDataSource } from "./data-source";

export async function initDatabase(): Promise<DataSource> {
  console.log("Подключение к базе данных...");
  const dataSource = createDataSource({
    url: config.databaseUrl,
    ssl: config.databaseSsl,
  });
  await dataSource.initialize();
  console.log("База данных подключена.");
  return dataSource;
}
