const schema = {
  kind: "singleType" as const,
  collectionName: "site_settings",
  info: {
    singularName: "site-setting",
    pluralName: "site-settings",
    displayName: "Site Settings",
    description: "Настройки и реквизиты компании",
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {},
  attributes: {
    companyName: {
      type: "string" as const,
    },
    unp: {
      type: "string" as const,
    },
    email: {
      type: "email" as const,
    },
    phone: {
      type: "string" as const,
    },
    address: {
      type: "text" as const,
    },
    botUsername: {
      type: "string" as const,
    },
    telegramSupport: {
      type: "string" as const,
    },
  },
};

export default schema;
