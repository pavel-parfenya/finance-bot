import type { ApiServices } from "@finance-bot/server-core";

export type ApiContainer = ApiServices;

let apiContainer: ApiContainer | null = null;

export function setApiContainer(container: ApiContainer): void {
  apiContainer = container;
}

export function getApiContainer(): ApiContainer {
  if (!apiContainer) {
    throw new Error("API container is not initialized");
  }
  return apiContainer;
}
