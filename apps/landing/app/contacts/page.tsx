import type { Metadata } from "next";
import { getCmsSiteSettings } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Контактная информация и реквизиты",
};

export default async function ContactsPage() {
  const settings = await getCmsSiteSettings();

  const email = settings?.email ?? "[EMAIL]";
  const telegramSupport = settings?.telegramSupport ?? "[TELEGRAM_SUPPORT]";
  const companyName = settings?.companyName ?? "[BRAND_NAME]";
  const unp = settings?.unp ?? "[UNP]";
  const address = settings?.address ?? "[ADDRESS]";
  const phone = settings?.phone ?? "[PHONE]";

  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-12">Контакты</h1>

      <div className="space-y-10">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Связаться с нами
          </h2>
          <div className="space-y-3">
            <ContactRow label="Email" value={email} href={`mailto:${email}`} />
            <ContactRow
              label="Telegram"
              value={`@${telegramSupport}`}
              href={`https://t.me/${telegramSupport}`}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-10">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Реквизиты
          </h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <RequisiteRow label="Наименование" value={companyName} />
              <RequisiteRow label="УНП" value={unp} />
              <RequisiteRow label="Юридический адрес" value={address} />
              <RequisiteRow label="Email" value={email} />
              <RequisiteRow label="Телефон" value={phone} />
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-400 w-20 flex-shrink-0">{label}</span>
      <a href={href} className="text-sm text-gray-900 hover:underline">
        {value}
      </a>
    </div>
  );
}

function RequisiteRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{label}</td>
      <td className="py-3 text-gray-900">{value}</td>
    </tr>
  );
}
