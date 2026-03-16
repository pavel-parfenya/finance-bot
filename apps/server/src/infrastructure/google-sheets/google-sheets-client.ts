import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export interface GoogleSheetsAuthConfig {
  serviceAccountEmail: string;
  privateKey: string;
}

export class GoogleSheetsClient {
  private readonly auth: JWT;
  private cache = new Map<string, GoogleSpreadsheet>();

  constructor(config: GoogleSheetsAuthConfig) {
    this.auth = new JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  async getDocument(sheetId: string): Promise<GoogleSpreadsheet> {
    const cached = this.cache.get(sheetId);
    if (cached) return cached;

    const doc = new GoogleSpreadsheet(sheetId, this.auth);
    await doc.loadInfo();
    this.cache.set(sheetId, doc);
    return doc;
  }
}
