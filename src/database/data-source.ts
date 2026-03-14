import { DataSource } from "typeorm";
import { User } from "./entities/user.entity";
import { Workspace } from "./entities/workspace.entity";
import { WorkspaceMember } from "./entities/workspace-member.entity";
import { Subscription } from "./entities/subscription.entity";
import { Transaction } from "./entities/transaction.entity";

export function createDataSource(url: string): DataSource {
  return new DataSource({
    type: "postgres",
    url,
    entities: [User, Workspace, WorkspaceMember, Subscription, Transaction],
    synchronize: true,
    logging: false,
  });
}
