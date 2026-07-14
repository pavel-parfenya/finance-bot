import { Module } from "@nestjs/common";
import { ContactsController } from "./contacts.controller";
import { ContactsApiService } from "./contacts-api.service";

@Module({
  controllers: [ContactsController],
  providers: [ContactsApiService],
})
export class ContactsModule {}
