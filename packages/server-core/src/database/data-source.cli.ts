import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { User } from "./entities/user.entity";
import { Workspace } from "./entities/workspace.entity";
import { WorkspaceMember } from "./entities/workspace-member.entity";
import { Subscription } from "./entities/subscription.entity";
import { Transaction } from "./entities/transaction.entity";
import { Invitation } from "./entities/invitation.entity";
import { Debt } from "./entities/debt.entity";
import { CustomCategory } from "./entities/custom-category.entity";
import { AppUserStatsSnapshot } from "./entities/app-user-stats-snapshot.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [
    User,
    Workspace,
    WorkspaceMember,
    Subscription,
    Transaction,
    Invitation,
    Debt,
    CustomCategory,
    AppUserStatsSnapshot,
  ],
  migrations: [path.join(__dirname, "migrations/*.ts")],
  synchronize: false,
  logging: false,
});
