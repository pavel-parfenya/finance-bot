import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { BillingUser } from "./billing-user.types";

export const BillingUserParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BillingUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.billingUser;
    if (!user) {
      throw new Error("BillingJwtGuard must run before @BillingUserParam()");
    }
    return user;
  }
);
