"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CmsPricingPlan } from "@/lib/cms";
import type { SubscriptionPlan } from "@/lib/billing";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000"
).replace(/\/$/, "");

/** Сопоставление тарифа CMS с доменным planid подписки. */
function resolvePlanId(plan: CmsPricingPlan): SubscriptionPlan | null {
  if (plan.price === 0) return "free";
  if (plan.period === "year") return "pro_year";
  if (plan.period === "month") return "pro_month";
  return null;
}

const BEPAID_WIDGET_SRC = "https://js.bepaid.by/widget/be_gateway.js";

interface BeGatewayParams {
  checkout_url: string;
  token: string;
  checkout: { iframe: boolean; test: boolean };
  closeWidget: (status: string | null) => void;
}

interface BeGatewayCtor {
  new (params: BeGatewayParams): { createWidget: () => void };
}

declare global {
  interface Window {
    BeGateway?: BeGatewayCtor;
  }
}

/** Однократно подгружает скрипт виджета bePaid и резолвит конструктор BeGateway. */
function loadBeGateway(): Promise<BeGatewayCtor> {
  return new Promise((resolve, reject) => {
    if (window.BeGateway) {
      resolve(window.BeGateway);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${BEPAID_WIDGET_SRC}"]`
    );
    const onReady = () => {
      if (window.BeGateway) resolve(window.BeGateway);
      else reject(new Error("BeGateway не загрузился"));
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("Ошибка загрузки виджета")));
      return;
    }
    const script = document.createElement("script");
    script.src = BEPAID_WIDGET_SRC;
    script.async = true;
    script.addEventListener("load", onReady);
    script.addEventListener("error", () => reject(new Error("Ошибка загрузки виджета")));
    document.body.appendChild(script);
  });
}

interface Props {
  token: string;
  plans: CmsPricingPlan[];
  currentPlan: SubscriptionPlan;
  downgradeScheduled: boolean;
}

const FREE: SubscriptionPlan = "free";

export default function SubscribeActions({
  token,
  plans,
  currentPlan,
  downgradeScheduled,
}: Props) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(planId: SubscriptionPlan) {
    setLoadingPlan(planId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });
      const body = (await res.json().catch(() => null)) as {
        mode?: "test" | "widget";
        message?: string;
        error?: string;
        token?: string;
        checkoutUrl?: string;
        test?: boolean;
      } | null;
      if (!res.ok) {
        setError(body?.error ?? "Не удалось создать оплату");
        return;
      }
      // bePaid: открываем виджет оплаты прямо на странице (iframe).
      if (body?.mode === "widget" && body.token && body.checkoutUrl) {
        const BeGateway = await loadBeGateway();
        new BeGateway({
          checkout_url: body.checkoutUrl,
          token: body.token,
          checkout: { iframe: true, test: body.test ?? false },
          // Активация подписки гарантируется webhook'ом; callback — только для UX.
          closeWidget: (status) => {
            if (status === "successful" || status === "pending") {
              router.push("/payment-success");
            } else if (status === "failed" || status === "error") {
              setError("Оплата не прошла. Попробуйте ещё раз.");
            }
            setLoadingPlan(null);
          },
        }).createWidget();
        return;
      }
      // Тестовый режим: оплата считается успешной — ведём на отдельную страницу.
      router.push("/payment-success");
    } catch {
      setError("Сервис временно недоступен. Попробуйте позже.");
    } finally {
      setLoadingPlan(null);
    }
  }

  // Понижение до Free: оплата не нужна, Pro сохраняется до конца оплаченного
  // периода (status=canceled, expiresAt не меняется), затем фичи режутся до Free.
  async function downgradeToFree() {
    setLoadingPlan(FREE);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/billing/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Не удалось перейти на Free");
        return;
      }
      setMessage(
        "Готово. Pro продолжит действовать до конца оплаченного периода, затем тариф станет Free."
      );
      router.refresh();
    } catch {
      setError("Сервис временно недоступен. Попробуйте позже.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row flex-wrap justify-center gap-6">
        {plans.map((plan) => {
          const planId = resolvePlanId(plan);
          const isCurrent = planId === currentPlan;
          const isPaid = planId === "pro_month" || planId === "pro_year";
          return (
            <div
              key={plan.id}
              className={`w-full md:w-72 rounded-2xl border p-8 flex flex-col ${
                plan.isPopular
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-900"
              }`}
            >
              <div className="mb-6">
                <p
                  className={`text-sm font-medium mb-1 ${
                    plan.isPopular ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {plan.description}
                </p>
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {plan.price === 0
                      ? "0"
                      : plan.price == null
                        ? "[PRICE]"
                        : String(plan.price)}
                  </span>
                  {plan.price !== 0 && (
                    <span
                      className={`text-sm ${
                        plan.isPopular ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      BYN
                      {plan.period === "year"
                        ? " / год"
                        : plan.period === "month"
                          ? " / месяц"
                          : ""}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {(plan.features ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className={plan.isPopular ? "text-gray-300" : "text-gray-600"}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <span
                  className={`block text-center rounded-md px-4 py-2.5 text-sm font-semibold ${
                    plan.isPopular
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  Текущий тариф
                </span>
              ) : isPaid && planId ? (
                <button
                  type="button"
                  onClick={() => checkout(planId)}
                  disabled={loadingPlan !== null}
                  className={`block w-full text-center rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    plan.isPopular
                      ? "bg-white text-gray-900 hover:bg-gray-100"
                      : "bg-gray-900 text-white hover:bg-gray-700"
                  }`}
                >
                  {loadingPlan === planId ? "Создаём оплату…" : (plan.ctaText ?? "Выбрать")}
                </button>
              ) : planId === FREE && downgradeScheduled ? (
                <span className="block text-center rounded-md px-4 py-2.5 text-sm font-semibold bg-gray-100 text-gray-500">
                  Подключится после Pro
                </span>
              ) : planId === FREE ? (
                <button
                  type="button"
                  onClick={() => downgradeToFree()}
                  disabled={loadingPlan !== null}
                  className="block w-full text-center rounded-md px-4 py-2.5 text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  {loadingPlan === FREE ? "Переключаем…" : "Перейти на Free"}
                </button>
              ) : (
                <span className="block text-center rounded-md px-4 py-2.5 text-sm font-semibold bg-gray-100 text-gray-500">
                  Бесплатный тариф
                </span>
              )}
            </div>
          );
        })}
      </div>

      {message && (
        <p className="mt-8 text-center text-sm rounded-md bg-gray-100 text-gray-700 px-4 py-3">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-8 text-center text-sm rounded-md bg-red-50 text-red-600 px-4 py-3">
          {error}
        </p>
      )}
    </div>
  );
}
