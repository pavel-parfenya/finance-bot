import { GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { IExpenseRepository } from "../../domain/interfaces";
import { Expense } from "../../domain/models";
import { GoogleSheetsClient } from "./google-sheets-client";

const HEADERS = [
  "Дата",
  "Время",
  "Личность",
  "Описание",
  "Категория",
  "Сумма",
  "Валюта",
  "Магазин",
];

const HEADER_BG = { red: 0.102, green: 0.137, blue: 0.494 };
const HEADER_FG = { red: 1, green: 1, blue: 1 };

export class GoogleSheetsExpenseRepository implements IExpenseRepository {
  private styled = false;

  constructor(private readonly client: GoogleSheetsClient) {}

  async save(expense: Expense): Promise<void> {
    const sheet = await this.getSheet();

    const time = expense.date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    await sheet.addRow({
      "Дата": expense.date.toISOString().split("T")[0],
      "Время": time,
      "Личность": expense.username,
      "Описание": expense.description,
      "Категория": expense.category,
      "Сумма": expense.amount,
      "Валюта": expense.currency,
      "Магазин": expense.store,
    });
  }

  private async getSheet(): Promise<GoogleSpreadsheetWorksheet> {
    const doc = await this.client.getDocument();
    let sheet = doc.sheetsByTitle[this.client.worksheetName];

    if (!sheet) {
      sheet = await doc.addSheet({
        title: this.client.worksheetName,
        headerValues: HEADERS,
      });
      await this.applyHeaderStyle(sheet);
      this.styled = true;
    }

    await sheet.loadHeaderRow();

    const hasHeaders = HEADERS.every((h) => sheet!.headerValues.includes(h));
    if (!hasHeaders) {
      await sheet.setHeaderRow(HEADERS);
      await this.applyHeaderStyle(sheet);
      this.styled = true;
    }

    if (!this.styled) {
      await this.applyHeaderStyle(sheet);
      this.styled = true;
    }

    return sheet;
  }

  private async applyHeaderStyle(
    sheet: GoogleSpreadsheetWorksheet
  ): Promise<void> {
    await sheet.loadCells({
      startRowIndex: 0,
      endRowIndex: 1,
      startColumnIndex: 0,
      endColumnIndex: HEADERS.length,
    });

    for (let col = 0; col < HEADERS.length; col++) {
      const cell = sheet.getCell(0, col);
      cell.textFormat = {
        bold: true,
        fontSize: 11,
        foregroundColorStyle: { rgbColor: HEADER_FG },
      };
      cell.backgroundColor = HEADER_BG;
      cell.horizontalAlignment = "CENTER";
    }

    await sheet.saveUpdatedCells();
  }
}
