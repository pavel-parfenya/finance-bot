import Link from "next/link";
import Image from "next/image";
import { getCmsSiteSettings } from "@/lib/cms";

export default async function Footer() {
  const settings = await getCmsSiteSettings();
  const brandName = settings?.companyName ?? "[BRAND_NAME]";
  const unp = settings?.unp ?? "[UNP]";
  const address = settings?.address ?? "[ADDRESS]";
  const botLink = settings?.botUsername
    ? `https://t.me/${settings.botUsername}`
    : "https://t.me/valentinethebuhgalter_bot";

  return (
    <footer className="mt-auto bg-ink text-neutral-300">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src={settings?.logoUrl ?? "/valentin.png"}
                alt={brandName}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white/15"
              />
              <span className="font-semibold text-white">{brandName}</span>
            </Link>
            <p className="mt-4 text-sm text-neutral-400">
              Учёт расходов голосом в Telegram
            </p>
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft"
            >
              Открыть бот
            </a>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Продукт
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/pricing" className="transition-colors hover:text-white">
                  Тарифы
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition-colors hover:text-white">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Компания
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/contacts" className="transition-colors hover:text-white">
                  Контакты
                </Link>
              </li>
              <li>
                <Link href="/payment" className="transition-colors hover:text-white">
                  Оплата
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Документы
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/offer" className="transition-colors hover:text-white">
                  Оферта
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-white">
                  Конфиденциальность
                </Link>
              </li>
              <li>
                <Link href="/refund" className="transition-colors hover:text-white">
                  Возврат
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-2 border-t border-white/10 pt-6 text-xs text-neutral-500 md:flex-row">
          <p>
            © {new Date().getFullYear()} {brandName}. Все права защищены.
          </p>
          <p>
            УНП: {unp} · {address}
          </p>
        </div>
      </div>
    </footer>
  );
}
