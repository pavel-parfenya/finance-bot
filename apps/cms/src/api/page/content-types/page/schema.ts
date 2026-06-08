const schema = {
  kind: "collectionType" as const,
  collectionName: "pages",
  info: {
    singularName: "page",
    pluralName: "pages",
    displayName: "Page",
    description: "CMS-страницы лендинга",
  },
  options: {
    draftAndPublish: true,
  },
  pluginOptions: {},
  attributes: {
    title: {
      type: "string" as const,
      required: true,
    },
    slug: {
      type: "uid" as const,
      targetField: "title",
      required: true,
    },
    content: {
      type: "richtext" as const,
    },
    seoTitle: {
      type: "string" as const,
    },
    seoDescription: {
      type: "text" as const,
    },
    lastUpdated: {
      type: "date" as const,
    },
  },
};

export default schema;
