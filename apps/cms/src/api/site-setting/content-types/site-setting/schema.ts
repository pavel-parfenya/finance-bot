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
    registrationDate: {
      type: "string" as const,
    },
    registrationAuthority: {
      type: "text" as const,
    },
    tradeRegisterNumber: {
      type: "string" as const,
    },
    tradeRegisterDate: {
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
    postalAddress: {
      type: "text" as const,
    },
    workingHours: {
      type: "string" as const,
    },
    license: {
      type: "text" as const,
    },
    botUsername: {
      type: "string" as const,
    },
    telegramSupport: {
      type: "string" as const,
    },
    logo: {
      type: "media" as const,
      multiple: false,
      allowedTypes: ["images"],
    },
    // Отображение логотипов платёжных систем в блоках оплаты (лендинг).
    // Каждый чекбокс включает/выключает соответствующий знак. По умолчанию все включены.
    showVisa: { type: "boolean" as const, default: true },
    showMastercard: { type: "boolean" as const, default: true },
    showBelkart: { type: "boolean" as const, default: true },
    showMir: { type: "boolean" as const, default: false },
    showErip: { type: "boolean" as const, default: true },
    showBepaid: { type: "boolean" as const, default: true },
    showApplePay: { type: "boolean" as const, default: false },
    showGooglePay: { type: "boolean" as const, default: false },
    showSamsungPay: { type: "boolean" as const, default: false },
    showYandexPay: { type: "boolean" as const, default: false },
    showMtbank: { type: "boolean" as const, default: false },
  },
};

export default schema;
