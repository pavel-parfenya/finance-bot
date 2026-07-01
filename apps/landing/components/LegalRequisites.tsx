import type { CmsSiteSettings } from "@/lib/cms";

/**
 * Реквизиты продавца по требованиям к интернет-магазину (Постановление СМ РБ
 * №31 и Закон о защите прав потребителей). Каждая строка выводится только если
 * соответствующее поле заполнено в Strapi — пустые блоки не показываем.
 */
export default function LegalRequisites({
  settings,
  className = "",
}: {
  settings: CmsSiteSettings | null;
  className?: string;
}) {
  if (!settings) return null;

  const registration = [settings.registrationDate, settings.registrationAuthority]
    .filter(Boolean)
    .join(", ");
  const tradeRegister = [settings.tradeRegisterNumber, settings.tradeRegisterDate]
    .filter(Boolean)
    .join(" от ");

  const rows: { label: string; value?: string }[] = [
    { label: "Наименование", value: settings.companyName },
    { label: "УНП", value: settings.unp },
    { label: "Госрегистрация", value: registration || undefined },
    { label: "Торговый реестр", value: tradeRegister || undefined },
    { label: "Юридический адрес", value: settings.address },
    { label: "Почтовый адрес", value: settings.postalAddress },
    { label: "Режим работы", value: settings.workingHours },
    { label: "Email", value: settings.email },
    { label: "Телефон", value: settings.phone },
    { label: "Лицензия", value: settings.license },
  ].filter((r) => Boolean(r.value));

  if (rows.length === 0) return null;

  return (
    <table className={`w-full text-sm ${className}`}>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="py-3 pr-4 align-top text-gray-400 whitespace-nowrap">
              {r.label}
            </td>
            <td className="py-3 whitespace-pre-line text-gray-900">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
