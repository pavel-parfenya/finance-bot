import Link from "next/link";
import { getCmsSiteSettings } from "@/lib/cms";

export default async function Footer() {
  const settings = await getCmsSiteSettings();
  const brandName = settings?.companyName ?? "[BRAND_NAME]";
  const unp = settings?.unp ?? "[UNP]";
  const address = settings?.address ?? "[ADDRESS]";

  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <p className="font-semibold text-gray-900 mb-3">{brandName}</p>
            <p className="text-sm text-gray-500">Учёт расходов голосом в Telegram</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Продукт
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/pricing" className="hover:text-gray-900 transition-colors">
                  Тарифы
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-gray-900 transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Компания
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/contacts" className="hover:text-gray-900 transition-colors">
                  Контакты
                </Link>
              </li>
              <li>
                <Link href="/payment" className="hover:text-gray-900 transition-colors">
                  Оплата
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Документы
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/offer" className="hover:text-gray-900 transition-colors">
                  Оферта
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-gray-900 transition-colors">
                  Конфиденциальность
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-gray-900 transition-colors">
                  Возврат
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row justify-between gap-2 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} {brandName}. Все права защищены.</p>
          <p>УНП: {unp} · {address}</p>
        </div>
      </div>
    </footer>
  );
}
