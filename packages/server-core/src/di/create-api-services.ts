import type { DataSource } from "typeorm";
import type { Config } from "../config";
import { TransactionRepository } from "../repositories/transaction-repository";
import { InvitationRepository } from "../repositories/invitation-repository";
import { DebtRepository } from "../repositories/debt-repository";
import { UserService } from "../services/user-service";
import { WorkspaceService } from "../services/workspace-service";
import { CustomCategoryRepository } from "../repositories/custom-category-repository";
import { CustomCategoryService } from "../services/custom-category-service";

export interface ApiServices {
  userService: UserService;
  workspaceService: WorkspaceService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
  debtRepo: DebtRepository;
  customCategoryService: CustomCategoryService;
}

/** Минимальный набор для Nest Mini App API (без LLM/STT и т.д.). */
export function createApiServices(_config: Config, dataSource: DataSource): ApiServices {
  const transactionRepo = new TransactionRepository(dataSource);
  const invitationRepo = new InvitationRepository(dataSource);
  const debtRepo = new DebtRepository(dataSource);
  const userService = new UserService(dataSource);
  const workspaceService = new WorkspaceService(dataSource);
  const customCategoryRepo = new CustomCategoryRepository(dataSource);
  const customCategoryService = new CustomCategoryService(customCategoryRepo);

  return {
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    debtRepo,
    customCategoryService,
  };
}
