export class InvalidExpenseError extends Error {
  constructor(message = "Невалидные данные расхода") {
    super(message);
    this.name = "InvalidExpenseError";
  }
}
