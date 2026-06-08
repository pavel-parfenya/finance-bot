const schema = {
  kind: "collectionType" as const,
  collectionName: "faqs",
  info: {
    singularName: "faq",
    pluralName: "faqs",
    displayName: "FAQ",
    description: "Вопросы и ответы",
  },
  options: {
    draftAndPublish: true,
  },
  pluginOptions: {},
  attributes: {
    question: {
      type: "string" as const,
      required: true,
    },
    answer: {
      type: "text" as const,
      required: true,
    },
    sortOrder: {
      type: "integer" as const,
      default: 0,
    },
  },
};

export default schema;
