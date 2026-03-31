import { Module } from "@nestjs/common";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceApiService } from "./workspace-api.service";

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceApiService],
})
export class WorkspaceModule {}
