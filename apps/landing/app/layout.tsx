import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "[BRAND_NAME] — учёт расходов голосом",
    template: "%s | [BRAND_NAME]",
  },
  description:
    "Telegram-бот для учёта финансов с распознаванием голосовых сообщений. Скажите о трате — бот запишет.",
  metadataBase: new URL("https://valentinethebuhgalter.by"),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://valentinethebuhgalter.by",
    siteName: "[BRAND_NAME]",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="flex flex-col min-h-screen bg-white text-gray-900 font-sans antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
