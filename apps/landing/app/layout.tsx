import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MetaPixel from "@/components/MetaPixel";
import { META_PIXEL_ID } from "@/lib/meta-pixel";
import { getCmsSiteSettings } from "@/lib/cms";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCmsSiteSettings();
  const brandName = settings?.companyName ?? "[BRAND_NAME]";
  return {
    title: {
      default: `${brandName} — учёт расходов голосом`,
      template: `%s | ${brandName}`,
    },
    description:
      "Telegram-бот для учёта финансов с распознаванием голосовых сообщений. Скажите о трате — бот запишет.",
    metadataBase: new URL("https://valentinethebuhgalter.by"),
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: "https://valentinethebuhgalter.by",
      siteName: brandName,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        {/* Meta Pixel: официальный сниппет — init + PageView первой загрузки.
            PageView при SPA-навигациях досылает <MetaPixel /> в body. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen bg-cream text-neutral-900 font-sans antialiased">
        <MetaPixel />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
