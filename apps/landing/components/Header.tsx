import Link from "next/link";
import { getCmsSiteSettings } from "@/lib/cms";

export default async function Header() {
  const settings = await getCmsSiteSettings();
  const brandName = settings?.companyName ?? "[BRAND_NAME]";
  const botLink = settings?.botUsername
    ? `https://t.me/${settings.botUsername}`
    : "https://t.me/valentinethebuhgalter_bot";

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900 tracking-tight">
          {brandName}
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/pricing" className="hover:text-gray-900 transition-colors">
            Тарифы
          </Link>
          <Link href="/faq" className="hover:text-gray-900 transition-colors">
            FAQ
          </Link>
          <Link href="/contacts" className="hover:text-gray-900 transition-colors">
            Контакты
          </Link>
        </nav>
        <a
          href={botLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          Открыть бот
        </a>
      </div>
    </header>
  );
}
