import { getCmsSiteSettings, type CmsSiteSettings } from "@/lib/cms";

/**
 * Логотипы платёжных систем и шлюза для блоков оплаты.
 * Используются оригинальные фирменные знаки из /public/payments
 * (официальные ассеты Visa / Mastercard / Белкарт / Мир / ЕРИП / bePaid /
 * Apple Pay / Google Pay / Samsung Pay / Yandex Pay / МТБанк).
 *
 * Какие знаки показывать — управляется чекбоксами в Strapi (Site Settings).
 * Знак скрывается только если соответствующий флаг явно выключен (=== false);
 * если поле не задано (старые записи или CMS недоступна) — знак показывается.
 * Высота каждой картинки подобрана так, чтобы знаки выглядели соразмерно.
 */

type Mark = {
  src: string;
  label: string;
  /** Поле-чекбокс в Site Settings, управляющее показом. */
  flag: keyof CmsSiteSettings;
  /** Высота картинки внутри карточки (Tailwind-класс). */
  imgClass: string;
};

const MARKS: Mark[] = [
  { src: "/payments/visa.png", label: "Visa", flag: "showVisa", imgClass: "h-5" },
  { src: "/payments/mastercard.png", label: "Mastercard", flag: "showMastercard", imgClass: "h-7" }, // prettier-ignore
  { src: "/payments/belkart.svg", label: "Белкарт", flag: "showBelkart", imgClass: "h-9" }, // prettier-ignore
  { src: "/payments/mir.svg", label: "Мир", flag: "showMir", imgClass: "h-6" },
  {
    src: "/payments/erip.svg",
    label: "ЕРИП — Единое расчётное и информационное пространство",
    flag: "showErip",
    imgClass: "h-6",
  },
  { src: "/payments/bepaid.svg", label: "Платёжный шлюз bePaid", flag: "showBepaid", imgClass: "h-5" }, // prettier-ignore
  { src: "/payments/applepay.svg", label: "Apple Pay", flag: "showApplePay", imgClass: "h-8" }, // prettier-ignore
  { src: "/payments/googlepay.svg", label: "Google Pay", flag: "showGooglePay", imgClass: "h-8" }, // prettier-ignore
  { src: "/payments/samsungpay.svg", label: "Samsung Pay", flag: "showSamsungPay", imgClass: "h-6" }, // prettier-ignore
  { src: "/payments/yandexpay.svg", label: "Yandex Pay", flag: "showYandexPay", imgClass: "h-5" }, // prettier-ignore
  { src: "/payments/mtbank.svg", label: "МТБанк", flag: "showMtbank", imgClass: "h-5" }, // prettier-ignore
];

export default async function PaymentBadges({
  settings,
}: {
  /** Настройки можно прокинуть, если они уже загружены выше; иначе компонент загрузит сам. */
  settings?: CmsSiteSettings | null;
}) {
  const cms = settings !== undefined ? settings : await getCmsSiteSettings();
  const marks = MARKS.filter((m) => cms?.[m.flag] !== false);

  if (marks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {marks.map((m) => (
        <span
          key={m.src}
          aria-label={m.label}
          title={m.label}
          className="inline-flex h-11 min-w-[60px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt={m.label}
            className={`${m.imgClass} w-auto object-contain`}
            loading="lazy"
          />
        </span>
      ))}
    </div>
  );
}
