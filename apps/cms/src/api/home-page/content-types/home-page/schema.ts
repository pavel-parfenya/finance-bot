const schema = {
  kind: "singleType" as const,
  collectionName: "home_pages",
  info: {
    singularName: "home-page",
    pluralName: "home-pages",
    displayName: "Home Page",
    description: "Контент главной страницы лендинга",
  },
  options: {
    draftAndPublish: true,
  },
  pluginOptions: {},
  attributes: {
    heroBadgeText: { type: "string" as const },
    heroTitle: { type: "string" as const },
    heroSubtitle: { type: "text" as const },
    heroPrimaryCtaText: { type: "string" as const },
    heroSecondaryCtaText: { type: "string" as const },
    featuresTitle: { type: "string" as const },
    featuresSubtitle: { type: "text" as const },
    features: { type: "json" as const },
    demoMessages: { type: "json" as const },
    ctaTitle: { type: "string" as const },
    ctaSubtitle: { type: "text" as const },
    ctaButtonText: { type: "string" as const },
    seoTitle: { type: "string" as const },
    seoDescription: { type: "text" as const },
  },
};

export default schema;
