import { Controller, Get } from "@nestjs/common";
import { ContactsApiService } from "./contacts-api.service";

/**
 * Контакты для Mini App (Настройки → Контакты). Данные публичные (те же, что
 * на лендинге /contacts), поэтому guard авторизации не нужен.
 */
@Controller("contacts")
export class ContactsController {
  constructor(private readonly contactsApi: ContactsApiService) {}

  @Get()
  getContacts() {
    return this.contactsApi.getContacts();
  }
}
