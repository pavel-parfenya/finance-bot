import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserApiService } from "./user-api.service";

@Module({
  controllers: [UserController],
  providers: [UserApiService],
})
export class UserModule {}
