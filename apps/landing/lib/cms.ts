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
  planId?: "free" | "pro_month" | "pro_year" | null;
  price: number | null;
  period: "month" | "year" | "once" | null;
  description: string;
  features: string[];
  isPopular: boolean;
  visible?: boolean;
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
  /** Абсолютный URL логотипа из media library Strapi (или null, если не задан). */
  logoUrl: string | null;
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

/** Strapi v5 отдаёт связь плоско, v4 — через `{ data: [{ attributes }] }`. */
function planFeatureLabels(planFeatures: unknown): string[] {
  const list = Array.isArray(planFeatures)
    ? planFeatures
    : planFeatures &&
        typeof planFeatures === "object" &&
        Array.isArray((planFeatures as { data?: unknown[] }).data)
      ? (planFeatures as { data: unknown[] }).data
      : [];
  return list
    .map((item) => {
      const attrs =
        item && typeof item === "object" && "attributes" in item
          ? (item as { attributes: Record<string, unknown> }).attributes
          : (item as Record<string, unknown>);
      return {
        label: typeof attrs?.label === "string" ? attrs.label : null,
        sortOrder: typeof attrs?.sortOrder === "number" ? attrs.sortOrder : 0,
      };
    })
    .filter((f): f is { label: string; sortOrder: number } => f.label !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((f) => f.label);
}

export async function getCmsPricingPlans(): Promise<CmsPricingPlan[]> {
  type Item = {
    id: number;
    attributes?: Record<string, unknown>;
  } & Record<string, unknown>;
  const data = await fetchCms<Item[]>(
    "/pricings?sort=sortOrder&populate[planFeatures]=true"
  );
  if (!Array.isArray(data)) return [];
  const plans = data.map((item) => {
    const attrs = ("attributes" in item ? item.attributes : item) as Record<
      string,
      unknown
    >;
    const relationLabels = planFeatureLabels(attrs.planFeatures);
    const jsonFeatures = Array.isArray(attrs.features)
      ? (attrs.features as string[])
      : [];
    return {
      id: item.id,
      ...attrs,
      // Источник истины для фич — связь planFeatures; json features оставляем как fallback.
      features: relationLabels.length > 0 ? relationLabels : jsonFeatures,
    };
  }) as CmsPricingPlan[];
  // visible === false скрывает план на лендинге; undefined (старые записи) считаем видимым.
  return plans.filter((plan) => plan.visible !== false);
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

/** Strapi v5 отдаёт media плоско, v4 — через `{ data: { attributes } }`. Возвращает абсолютный URL. */
function mediaUrl(media: unknown): string | null {
  if (!media || typeof media !== "object") return null;
  const node = "data" in media ? (media as { data: unknown }).data : media;
  if (!node || typeof node !== "object") return null;
  const attrs =
    "attributes" in node
      ? (node as { attributes: Record<string, unknown> }).attributes
      : (node as Record<string, unknown>);
  const url = typeof attrs?.url === "string" ? attrs.url : null;
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export async function getCmsSiteSettings(): Promise<CmsSiteSettings | null> {
  const data = await fetchCms<
    { attributes?: Record<string, unknown> } & Record<string, unknown>
  >("/site-setting?populate=*");
  if (!data) return null;
  const attrs = ("attributes" in data ? data.attributes : data) as Record<
    string,
    unknown
  >;
  return {
    ...attrs,
    logoUrl: mediaUrl(attrs.logo),
  } as unknown as CmsSiteSettings;
}

export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  type Item = { id: number; attributes?: Omit<CmsPage, never> } & CmsPage;
  const data = await fetchCms<Item[]>(`/pages?filters[slug][$eq]=${slug}&populate=*`);
  if (!Array.isArray(data) || data.length === 0) return null;
  const item = data[0];
  return ("attributes" in item ? item.attributes : item) as CmsPage;
}
