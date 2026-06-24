import { getCmsSiteSettings } from "@/lib/cms";
import HeaderClient from "./HeaderClient";

export default async function Header() {
  const settings = await getCmsSiteSettings();
  const brandName = settings?.companyName ?? "[BRAND_NAME]";
  const botLink = settings?.botUsername
    ? `https://t.me/${settings.botUsername}`
    : "https://t.me/valentinethebuhgalter_bot";
  const logoUrl = settings?.logoUrl ?? "/valentin.png";

  return <HeaderClient brandName={brandName} botLink={botLink} logoUrl={logoUrl} />;
}
