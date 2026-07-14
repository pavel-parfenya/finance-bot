import { Injectable } from "@nestjs/common";
import { StrapiSiteSettings } from "@finance-bot/server-core";
import type { ContactsResponse } from "@finance-bot/shared";

@Injectable()
export class ContactsApiService {
  constructor(private readonly strapiSiteSettings: StrapiSiteSettings) {}

  async getContacts(): Promise<ContactsResponse> {
    const contacts = await this.strapiSiteSettings.getContacts();
    if (!contacts) {
      return { email: null, telegramSupport: null, error: "Контакты недоступны" };
    }
    return contacts;
  }
}
