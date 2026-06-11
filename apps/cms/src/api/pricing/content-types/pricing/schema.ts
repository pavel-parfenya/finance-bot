const schema = {
  kind: "collectionType" as const,
  collectionName: "pricings",
  info: {
    singularName: "pricing",
    pluralName: "pricings",
    displayName: "Pricing",
    description: "Тарифные планы",
  },
  options: {
    draftAndPublish: true,
  },
  pluginOptions: {},
  attributes: {
    name: {
      type: "string" as const,
      required: true,
    },
    planId: {
      type: "enumeration" as const,
      enum: ["free", "pro_month", "pro_year"],
    },
    price: {
      type: "decimal" as const,
    },
    period: {
      type: "enumeration" as const,
      enum: ["month", "year", "once"],
      default: "month",
    },
    description: {
      type: "text" as const,
    },
    features: {
      type: "json" as const,
    },
    planFeatures: {
      type: "relation" as const,
      relation: "manyToMany" as const,
      target: "api::feature.feature" as const,
      inversedBy: "pricings",
    },
    isPopular: {
      type: "boolean" as const,
      default: false,
    },
    visible: {
      type: "boolean" as const,
      default: true,
    },
    ctaText: {
      type: "string" as const,
    },
    sortOrder: {
      type: "integer" as const,
      default: 0,
    },
  },
};

export default schema;
