import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  worksheetName: string;
  serviceAccountEmail: string;
  privateKey: string;
}

export class GoogleSheetsClient {
  private doc: GoogleSpreadsheet | null = null;

  constructor(private readonly config: GoogleSheetsConfig) {}

  get worksheetName(): string {
    return this.config.worksheetName;
  }

  async getDocument(): Promise<GoogleSpreadsheet> {
    if (this.doc) return this.doc;

    const auth = new JWT({
      email: this.config.serviceAccountEmail,
      key: this.config.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.doc = new GoogleSpreadsheet(this.config.spreadsheetId, auth);
    await this.doc.loadInfo();
    return this.doc;
  }
}
