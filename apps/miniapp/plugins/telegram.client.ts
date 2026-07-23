interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initData?: string;
  colorScheme?: "light" | "dark";
  onEvent?: (event: string, handler: () => void) => void;
  setBackgroundColor?: (color: string) => void;
  setHeaderColor?: (color: string) => void;
}

/** Фоновый цвет приложения по теме — держим синхронно с --bg в tokens.css,
 *  чтобы хром Telegram (шапка/фон) сливался с Mini App. */
const BG_BY_THEME: Record<"light" | "dark", string> = {
  light: "#f6f5ef",
  dark: "#0f1128",
};

function applyTheme(scheme: "light" | "dark") {
  const root = document.documentElement;
  root.dataset.theme = scheme;
  root.style.colorScheme = scheme;
}

export default defineNuxtPlugin(() => {
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
    ?.WebApp;

  // Тема: внутри Telegram — по colorScheme, вне — по системной настройке.
  const resolveScheme = (): "light" | "dark" =>
    tg?.colorScheme ??
    (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  const syncTheme = () => {
    const scheme = resolveScheme();
    applyTheme(scheme);
    // Подводим фон/шапку Telegram под тему приложения (если API доступно).
    try {
      tg?.setBackgroundColor?.(BG_BY_THEME[scheme]);
      tg?.setHeaderColor?.(BG_BY_THEME[scheme]);
    } catch {
      /* старые клиенты Telegram могут не поддерживать set*Color — не критично */
    }
  };

  syncTheme();

  if (tg) {
    // Реактивное переключение при смене темы в Telegram.
    tg.onEvent?.("themeChanged", syncTheme);

    // Запоминаем launch-параметры сразу при старте: Telegram отдаёт их только в
    // первом открытии, а уход на /subscribe и возврат «Назад» могут перезагрузить
    // WebView уже без них. Запасной источник авторизации — sessionStorage
    // (см. getInitData в api/client.ts).
    if (tg.initData) {
      try {
        sessionStorage.setItem("tg-init-data", tg.initData);
      } catch {
        /* sessionStorage недоступен — полагаемся на «живой» initData */
      }
    }
    tg.ready();
    tg.expand();
  } else {
    // Вне Telegram — следим за системным переключателем темы.
    window
      .matchMedia?.("(prefers-color-scheme: dark)")
      .addEventListener?.("change", syncTheme);
  }
});
