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
    isPopular: {
      type: "boolean" as const,
      default: false,
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
