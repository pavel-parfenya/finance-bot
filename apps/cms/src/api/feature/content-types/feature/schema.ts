const schema = {
  kind: "collectionType" as const,
  collectionName: "features",
  info: {
    singularName: "feature",
    pluralName: "features",
    displayName: "Feature",
    description: "Фичи тарифов (каталог для выбора в планах и гейтинга функций)",
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {},
  attributes: {
    key: {
      type: "string" as const,
      required: true,
      unique: true,
    },
    label: {
      type: "string" as const,
      required: true,
    },
    sortOrder: {
      type: "integer" as const,
      default: 0,
    },
    pricings: {
      type: "relation" as const,
      relation: "manyToMany" as const,
      target: "api::pricing.pricing" as const,
      mappedBy: "planFeatures",
    },
  },
};

export default schema;
