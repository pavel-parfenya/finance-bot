import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        response.status(status).json({ error: res });
        return;
      }
      response.status(status).json(res);
      return;
    }
    console.error(exception);
    response.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}
