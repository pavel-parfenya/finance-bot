const API_URL = process.env.STRAPI_API_URL ?? "http://localhost:1337";

export interface CmsFeature {
  icon: string;
  title: string;
  description: string;
}

export interface CmsDemoMessage {
  role: "user" | "bot";
  text: string;
  isVoice?: boolean;
}

export interface CmsHomePage {
  heroBadgeText: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCtaText: string;
  heroSecondaryCtaText: string;
  featuresTitle: string;
  featuresSubtitle: string;
  features: CmsFeature[];
  demoMessages: CmsDemoMessage[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface CmsPricingPlan {
  id: number;
  name: string;
  price: number | null;
  period: "month" | "year" | "once" | null;
  description: string;
  features: string[];
  isPopular: boolean;
  ctaText: string;
  sortOrder: number;
}

export interface CmsFaq {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface CmsSiteSettings {
  companyName: string;
  unp: string;
  email: string;
  phone: string;
  address: string;
  botUsername: string;
  telegramSupport: string;
}

export interface CmsPage {
  title: string;
  slug: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  lastUpdated?: string;
}

async function fetchCms<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as T;
  } catch {
    return null;
  }
}

export async function getCmsHomePage(): Promise<CmsHomePage | null> {
  const data = await fetchCms<{ attributes?: CmsHomePage } & CmsHomePage>(
    "/home-page?populate=*"
  );
  if (!data) return null;
  return ("attributes" in data ? data.attributes : data) as CmsHomePage;
}

export async function getCmsPricingPlans(): Promise<CmsPricingPlan[]> {
  type Item = { id: number; attributes?: Omit<CmsPricingPlan, "id"> } & Omit<
    CmsPricingPlan,
    "id"
  >;
  const data = await fetchCms<Item[]>("/pricings?sort=sortOrder&populate=*");
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({
    id: item.id,
    ...("attributes" in item ? item.attributes : item),
  })) as CmsPricingPlan[];
}

export async function getCmsFaqs(): Promise<CmsFaq[]> {
  type Item = { id: number; attributes?: Omit<CmsFaq, "id"> } & Omit<CmsFaq, "id">;
  const data = await fetchCms<Item[]>("/faqs?sort=sortOrder&populate=*");
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({
    id: item.id,
    ...("attributes" in item ? item.attributes : item),
  })) as CmsFaq[];
}

export async function getCmsSiteSettings(): Promise<CmsSiteSettings | null> {
  const data = await fetchCms<{ attributes?: CmsSiteSettings } & CmsSiteSettings>(
    "/site-setting?populate=*"
  );
  if (!data) return null;
  return ("attributes" in data ? data.attributes : data) as CmsSiteSettings;
}

export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  type Item = { id: number; attributes?: Omit<CmsPage, never> } & CmsPage;
  const data = await fetchCms<Item[]>(`/pages?filters[slug][$eq]=${slug}&populate=*`);
  if (!Array.isArray(data) || data.length === 0) return null;
  const item = data[0];
  return ("attributes" in item ? item.attributes : item) as CmsPage;
}
