import Link from "next/link";
import Image from "next/image";
import { getCmsSiteSettings } from "@/lib/cms";

export default async function Header() {
  const settings = await getCmsSiteSettings();
  const brandName = settings?.companyName ?? "[BRAND_NAME]";
  const botLink = settings?.botUsername
    ? `https://t.me/${settings.botUsername}`
    : "https://t.me/valentinethebuhgalter_bot";

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src={settings?.logoUrl ?? "/valentin.png"}
            alt={brandName}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-accent/20 transition-transform group-hover:scale-105"
          />
          <span className="font-semibold text-neutral-900 tracking-tight">
            {brandName}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
          <Link href="/pricing" className="hover:text-neutral-900 transition-colors">
            Тарифы
          </Link>
          <Link href="/faq" className="hover:text-neutral-900 transition-colors">
            FAQ
          </Link>
          <Link href="/contacts" className="hover:text-neutral-900 transition-colors">
            Контакты
          </Link>
        </nav>
        <a
          href={botLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:bg-neutral-800 hover:shadow-lift"
        >
          Открыть бот
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
