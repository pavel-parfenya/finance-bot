import { DataSource } from "typeorm";
import { User } from "./entities/user.entity";
import { Workspace } from "./entities/workspace.entity";
import { WorkspaceMember } from "./entities/workspace-member.entity";
import { Subscription } from "./entities/subscription.entity";
import { Transaction } from "./entities/transaction.entity";
import { Invitation } from "./entities/invitation.entity";
import { Debt } from "./entities/debt.entity";
import { CustomCategory } from "./entities/custom-category.entity";

export interface DataSourceOptions {
  url: string;
  ssl?: boolean;
}

export function createDataSource(options: DataSourceOptions | string): DataSource {
  const url = typeof options === "string" ? options : options.url;
  const ssl = typeof options === "string" ? undefined : options.ssl;
  return new DataSource({
    type: "postgres",
    url,
    entities: [
      User,
      Workspace,
      WorkspaceMember,
      Subscription,
      Transaction,
      Invitation,
      Debt,
      CustomCategory,
    ],
    synchronize: false,
    logging: false,
    ...(ssl !== undefined && {
      ssl: ssl ? { rejectUnauthorized: false } : false,
    }),
  });
}
